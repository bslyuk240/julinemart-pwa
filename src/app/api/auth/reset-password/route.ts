import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function POST(request: NextRequest) {
  try {
    const { key, login, password } = await request.json();
    
    if (!WP_URL) {
      console.error('Reset password failed: NEXT_PUBLIC_WP_URL is not set');
      return NextResponse.json(
        { error: 'Configuration missing. Please contact support.' },
        { status: 500 }
      );
    }
    
    if (!key || !login || !password) {
      return NextResponse.json(
        { error: 'Missing reset parameters' },
        { status: 400 }
      );
    }
    
    // Call WooCommerce password reset endpoint
    const response = await fetch(
      `${WP_URL}/wp-json/wc/v3/customers/password/reset`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          login,
          password,
        }),
      }
    );
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      console.error('Reset password failed:', data);
      return NextResponse.json(
        { error: data.error || data.message || 'Invalid or expired reset link' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password handler error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
