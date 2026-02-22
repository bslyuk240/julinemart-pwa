import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    return NextResponse.json(
      {
        success: false,
        message:
          'Missing NEXT_PUBLIC_FIREBASE_* web SDK environment variables for web push.',
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
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
