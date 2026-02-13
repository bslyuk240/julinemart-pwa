// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';

type SendPayload = {
  customerId?: string | number;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  type?: string;
};

type FcmLegacyResult = {
  message_id?: string;
  error?: string;
};

type FcmLegacyResponse = {
  success?: number;
  failure?: number;
  results?: FcmLegacyResult[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendPayload;
    const { customerId, title, message, data, type } = body;

    if (!customerId || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (customerId, title, message)' },
        { status: 400 }
      );
    }

    console.log(`Sending notification to customer ${customerId}`);
    console.log(`Title: ${title}`);
    console.log(`Type: ${type || 'general'}`);

    const tokensResponse = await fetch(
      `${request.nextUrl.origin}/api/notifications/register-device?customerId=${customerId}`,
      { method: 'GET' }
    );
    const tokensData = (await tokensResponse.json()) as {
      success?: boolean;
      tokens?: string[];
    };

    if (!tokensData.success || !tokensData.tokens || tokensData.tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No devices registered for this customer',
      });
    }

    const fcmServerKey = process.env.FCM_SERVER_KEY;
    if (!fcmServerKey) {
      return NextResponse.json(
        { success: false, message: 'FCM_SERVER_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    const results = await Promise.allSettled(
      tokensData.tokens.map(async (token) => {
        const fcmPayload = {
          to: token,
          notification: {
            title,
            body: message,
            sound: 'default',
            icon: 'ic_launcher',
            color: '#77088a',
          },
          data: {
            type: type || 'general',
            ...(data || {}),
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

        const rawText = await response.text();
        if (!response.ok) {
          throw new Error(`FCM HTTP ${response.status}: ${rawText || response.statusText}`);
        }

        let parsed: FcmLegacyResponse;
        try {
          parsed = JSON.parse(rawText) as FcmLegacyResponse;
        } catch {
          throw new Error(`FCM returned non-JSON response: ${rawText}`);
        }

        if ((parsed.failure || 0) > 0) {
          const err = parsed.results?.[0]?.error || 'unknown_error';
          throw new Error(`FCM rejected token: ${err}`);
        }

        return {
          token,
          messageId: parsed.results?.[0]?.message_id || null,
        };
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureReasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    const failureCount = failureReasons.length;

    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'FCM rejected all target tokens',
          sent: 0,
          failed: failureCount,
          totalDevices: tokensData.tokens.length,
          errors: failureReasons,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: failureCount === 0,
      message: failureCount === 0 ? 'Notifications sent' : 'Notifications partially sent',
      sent: successCount,
      failed: failureCount,
      totalDevices: tokensData.tokens.length,
      errors: failureReasons,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notification';
    console.error('Send notification error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

