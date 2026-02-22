// src/app/api/notifications/register-device/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const { customerId, fcmToken, platform } = body;
    const normalizedPlatform =
      platform === undefined || platform === null || platform === ''
        ? 'android'
        : platform === 'android' || platform === 'web'
          ? platform
          : null;

    if (!customerId || !fcmToken) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId or fcmToken' },
        { status: 400 }
      );
    }

    if (!normalizedPlatform) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid platform. Supported values: android, web',
        },
        { status: 400 }
      );
    }

    console.log(`Registering device token for customer ${customerId}`);
    console.log(`Token prefix: ${String(fcmToken).substring(0, 20)}...`);
    console.log(`Platform: ${normalizedPlatform}`);

    // If the same physical device token was previously tied to another customer,
    // remove that stale association so re-login can rebind cleanly.
    const { error: reassignmentCleanupError } = await supabase
      .from('device_tokens')
      .delete()
      .eq('fcm_token', fcmToken)
      .neq('customer_id', customerId);

    if (reassignmentCleanupError) {
      throw new Error(`Database error: ${reassignmentCleanupError.message}`);
    }

    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          customer_id: customerId,
          fcm_token: fcmToken,
          platform: normalizedPlatform,
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id,fcm_token',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      const errorCode = (error as { code?: string }).code;

      // Fallback for schemas with unique(fcm_token): rebind the token to the current customer.
      if (errorCode === '23505') {
        const { error: updateError } = await supabase
          .from('device_tokens')
          .update({
            customer_id: customerId,
            platform: normalizedPlatform,
            updated_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
          })
          .eq('fcm_token', fcmToken);

        if (updateError) {
          throw new Error(`Database error: ${updateError.message}`);
        }
      } else {
        throw new Error(`Database error: ${error.message}`);
      }
    }

    const { count, error: countError } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    if (countError) {
      throw new Error(`Database error: ${countError.message}`);
    }

    console.log(
      `Token registered. Customer ${customerId} now has ${count || 1} device(s)`
    );

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      tokenCount: count || 1,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to register device';
    console.error('Register device error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const customerId = request.nextUrl.searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('device_tokens')
      .select('fcm_token, platform, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const tokens = data?.map((d) => d.fcm_token) || [];

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
      updatedAt: data?.[0]?.updated_at || null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to get device tokens';
    console.error('Get device tokens error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
