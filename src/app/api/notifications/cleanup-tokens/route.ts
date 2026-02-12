// src/app/api/notifications/cleanup-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gfikkrwhsedhwmkxybzm.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmaWtrcndoc2VkaHdta3h5YnptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NDYyOTIsImV4cCI6MjA3ODIyMjI5Mn0.1jkYz1x43YjQZP4V8Y26fbtVGQOkfDMlnPf5s73JAB4';
const supabase = createClient(supabaseUrl, supabaseKey);

// DELETE endpoint to remove specific token or all tokens for a customer
export async function DELETE(request: NextRequest) {
  try {
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
      // Delete specific token
      query = query.eq('customer_id', customerId).eq('fcm_token', fcmToken);
      console.log(`🗑️ Deleting specific token for customer ${customerId}`);
    } else {
      // Delete all tokens for customer
      query = query.eq('customer_id', customerId);
      console.log(`🗑️ Deleting all tokens for customer ${customerId}`);
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
  } catch (error: any) {
    console.error('❌ Delete token error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete token' },
      { status: 500 }
    );
  }
}

// GET endpoint to clean up old unused tokens (older than 90 days)
export async function GET() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    console.log(`🧹 Cleaning up tokens older than ${ninetyDaysAgo.toISOString()}`);

    const { data, error } = await supabase
      .from('device_tokens')
      .delete()
      .lt('last_used_at', ninetyDaysAgo.toISOString())
      .select();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const deletedCount = data?.length || 0;
    console.log(`✅ Cleaned up ${deletedCount} old tokens`);

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedCount} old tokens`,
      deletedCount,
    });
  } catch (error: any) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to cleanup tokens' },
      { status: 500 }
    );
  }
}