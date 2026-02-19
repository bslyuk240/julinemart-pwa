// src/app/api/notifications/cleanup-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// DELETE endpoint to remove specific token or all tokens for a customer
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const customerId = request.nextUrl.searchParams.get('customerId');
    const fcmToken = request.nextUrl.searchParams.get('fcmToken');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId parameter' },
        { status: 400 }
      );
    }

    let query = supabase.from('device_tokens').delete();

    if (fcmToken) {
      query = query.eq('customer_id', customerId).eq('fcm_token', fcmToken);
      console.log(`Deleting specific token for customer ${customerId}`);
    } else {
      query = query.eq('customer_id', customerId);
      console.log(`Deleting all tokens for customer ${customerId}`);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return NextResponse.json({
      success: true,
      message: fcmToken
        ? 'Token deleted successfully'
        : 'All tokens deleted for customer',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete token';
    console.error('Delete token error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// GET endpoint to clean up old unused tokens (older than 90 days)
export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`Cleaning up tokens older than ${ninetyDaysAgo.toISOString()}`);

    const { data, error } = await supabase
      .from('device_tokens')
      .delete()
      .lt('last_used_at', ninetyDaysAgo.toISOString())
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    console.log(`Cleaned up ${deletedCount} old tokens`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} old tokens`,
      deletedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to cleanup tokens';
    console.error('Cleanup error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
