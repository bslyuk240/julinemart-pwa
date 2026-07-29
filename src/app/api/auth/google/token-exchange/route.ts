import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    logger.info('Token exchange request received');
    logger.info('Code present:', !!code);

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing code or redirectUri' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ANDROID_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      logger.error('Missing Google OAuth credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    logger.info('Exchanging authorization code for tokens...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      logger.error('Token exchange failed', new Error(errorData.error_description ?? 'unknown'));
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();
    logger.info('Tokens received successfully');

    return NextResponse.json({
      success: true,
      id_token: tokens.id_token,
      access_token: tokens.access_token,
    });
  } catch (error) {
    logger.error('Token exchange error', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
