// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, title, message, data, type } = body;

    if (!customerId || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (customerId, title, message)' },
        { status: 400 }
      );
    }

    console.log(`📤 Sending notification to customer ${customerId}`);
    console.log(`   Title: ${title}`);
    console.log(`   Message: ${message}`);
    console.log(`   Type: ${type || 'general'}`);

    // Get customer's FCM tokens
    const tokensResponse = await fetch(
      `${request.nextUrl.origin}/api/notifications/register-device?customerId=${customerId}`,
      { method: 'GET' }
    );

    const tokensData = await tokensResponse.json();

    if (!tokensData.success || !tokensData.tokens || tokensData.tokens.length === 0) {
      console.log('⚠️  No devices registered for this customer');
      return NextResponse.json({
        success: false,
        message: 'No devices registered for this customer',
      });
    }

    console.log(`📱 Found ${tokensData.tokens.length} device(s) for customer ${customerId}`);

    // Firebase Cloud Messaging requires a server key
    // This is a placeholder - you'll need to implement actual FCM sending
    // after setting up Firebase
    
    const fcmServerKey = process.env.FCM_SERVER_KEY;

    if (!fcmServerKey) {
      console.warn('⚠️  FCM_SERVER_KEY not configured. Skipping actual notification send.');
      console.log('   (Notification would be sent in production)');
      
      return NextResponse.json({
        success: true,
        message: 'FCM not configured. Add FCM_SERVER_KEY to environment variables.',
        simulated: true,
        deviceCount: tokensData.tokens.length,
      });
    }

    // Send notification to each device via FCM
    const results = await Promise.allSettled(
      tokensData.tokens.map(async (token: string) => {
        const fcmPayload = {
          to: token,
          notification: {
            title,
            body: message,
            sound: 'default',
            icon: 'ic_launcher',
            color: '#77088a', // JulineMart purple
          },
          data: {
            type: type || 'general',
            ...data,
          },
          priority: 'high',
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `key=${fcmServerKey}`,
          },
          body: JSON.stringify(fcmPayload),
        });

        if (!response.ok) {
          throw new Error(`FCM error: ${response.statusText}`);
        }

        return await response.json();
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r) => r.status === 'rejected').length;

    console.log(`✅ Notification sent: ${successCount} success, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: 'Notifications sent',
      sent: successCount,
      failed: failureCount,
      totalDevices: tokensData.tokens.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to send notification';
    console.error('❌ Send notification error:', error);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
