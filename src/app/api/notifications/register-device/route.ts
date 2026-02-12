// src/app/api/notifications/register-device/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfikkrwhsedhwmkxybzm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaWtrcndoc2VkaHdta3h5YnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDYyOTIsImV4cCI6MjA3ODIyMjI5Mn0.1jkYz1x43YjQZP4V8Y26fbtVGQOkfDMlnPf5s73JAB4';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, fcmToken, platform } = body;

    if (!customerId || !fcmToken) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId or fcmToken' },
        { status: 400 }
      );
    }

    console.log(`📱 Registering device token for customer ${customerId}`);
    console.log(`   Token: ${fcmToken.substring(0, 20)}...`);
    console.log(`   Platform: ${platform || 'android'}`);

    // Upsert device token into Supabase (handles duplicates automatically)
    const { data, error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          customer_id: customerId,
          fcm_token: fcmToken,
          platform: platform || 'android',
          updated_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
        },
        {
          onConflict: 'customer_id,fcm_token',
          ignoreDuplicates: false,
        }
      )
      .select();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    // Count total devices for this customer
    const { count } = await supabase
      .from('device_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    console.log(`✅ Token registered. Customer ${customerId} now has ${count || 1} device(s)`);

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      tokenCount: count || 1,
    });
  } catch (error: any) {
    console.error('❌ Register device error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}

// Helper function to get tokens for a customer
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId' },
        { status: 400 }
      );
    }

    // Fetch all tokens for this customer from Supabase
    const { data, error } = await supabase
      .from('device_tokens')
      .select('fcm_token, platform, created_at, updated_at')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    const tokens = data?.map((d) => d.fcm_token) || [];

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
      updatedAt: data?.[0]?.updated_at || null,
    });
  } catch (error: any) {
    console.error('❌ Get device tokens error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get device tokens' },
      { status: 500 }
    );
  }
}