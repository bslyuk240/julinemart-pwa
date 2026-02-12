import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, redirectUri } = await request.json();

    console.log('📥 Token exchange request received');
    console.log('Code present:', !!code);
    console.log('RedirectUri:', redirectUri);

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: 'Missing code or redirectUri' },
        { status: 400 }
      );
    }

    // Use Android Web OAuth client credentials
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ANDROID_CLIENT_SECRET;

    console.log('Has clientId:', !!clientId);
    console.log('Has clientSecret:', !!clientSecret);
    console.log('ClientId length:', clientId?.length);

    if (!clientId || !clientSecret) {
      console.error('❌ Missing Google OAuth credentials', {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret,
      });
      return NextResponse.json(
        { error: 'Server configuration error', details: { hasClientId: !!clientId, hasClientSecret: !!clientSecret } },
        { status: 500 }
      );
    }

    console.log('🔄 Exchanging authorization code for tokens...');

    // Exchange code for tokens
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
      console.error('Token exchange failed:', errorData);
      return NextResponse.json(
        { error: errorData.error_description || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('✅ Tokens received successfully');

    return NextResponse.json({
      success: true,
      id_token: tokens.id_token,
      access_token: tokens.access_token,
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
