import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY = process.env.NEXT_PUBLIC_WC_KEY;
const WC_SECRET = process.env.NEXT_PUBLIC_WC_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!WP_URL) {
      console.error('Forgot password failed: NEXT_PUBLIC_WP_URL is not set');
      return NextResponse.json(
        { error: 'Configuration missing. Please contact support.' },
        { status: 500 }
      );
    }

    // Helper to call an endpoint with optional Basic auth
    const callEndpoint = async (path: string, useAuth = false) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (useAuth && WC_KEY && WC_SECRET) {
        headers.Authorization = `Basic ${Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')}`;
      }
      return fetch(`${WP_URL}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });
    };

    // 1) Try WooCommerce customers password forgot (with auth if available)
    let response = await callEndpoint('/wp-json/wc/v3/customers/password/forgot', Boolean(WC_KEY && WC_SECRET));
    if (!response.ok && !WC_KEY) {
      // retry with auth if first attempt lacked it
      response = await callEndpoint('/wp-json/wc/v3/customers/password/forgot', true);
    }

    // 2) Fallback: WordPress core lostpassword endpoint
    if (!response.ok) {
      const wpLost = await callEndpoint('/wp-json/wp/v2/users/lostpassword');
      if (wpLost.ok) {
        return NextResponse.json({ success: true });
      }
      const errData = await wpLost.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.message || 'Unable to send reset email' },
        { status: wpLost.status || 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Forgot password handler error:', error);
    return NextResponse.json(
      { error: 'Failed to send reset email' },
      { status: 500 }
    );
  }
}
