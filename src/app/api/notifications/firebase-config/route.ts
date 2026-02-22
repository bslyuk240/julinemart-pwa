import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readEnv(key: string) {
  return process.env[key];
}

function readNextPublicFallback(suffix: string) {
  // Avoid direct NEXT_PUBLIC_* property access so values are not inlined into build artifacts.
  const key = ['NEXT', 'PUBLIC', 'FIREBASE', suffix].join('_');
  return readEnv(key);
}

export async function GET() {
  const apiKey =
    readEnv('FIREBASE_WEB_API_KEY') || readNextPublicFallback('API_KEY');
  const authDomain =
    readEnv('FIREBASE_WEB_AUTH_DOMAIN') || readNextPublicFallback('AUTH_DOMAIN');
  const projectId =
    readEnv('FIREBASE_WEB_PROJECT_ID') || readNextPublicFallback('PROJECT_ID');
  const messagingSenderId =
    readEnv('FIREBASE_WEB_MESSAGING_SENDER_ID') ||
    readNextPublicFallback('MESSAGING_SENDER_ID');
  const appId =
    readEnv('FIREBASE_WEB_APP_ID') || readNextPublicFallback('APP_ID');
  const vapidKey =
    readEnv('FIREBASE_WEB_VAPID_KEY') || readNextPublicFallback('VAPID_KEY');

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !messagingSenderId ||
    !appId ||
    !vapidKey
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Missing Firebase web push environment variables. Required: FIREBASE_WEB_* (or NEXT_PUBLIC_FIREBASE_* fallback).',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      config: {
        apiKey,
        authDomain,
        projectId,
        messagingSenderId,
        appId,
      },
      vapidKey,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
