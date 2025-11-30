import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function POST(request: NextRequest) {
  try {
    const { key, login, password } = await request.json();

    if (!WP_URL) {
      console.error('NEXT_PUBLIC_WP_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!key || !login || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    console.log('=== Password Reset Submit ===');
    console.log('Login:', login);
    console.log('Key length:', key.length);
    console.log('Calling:', `${WP_URL}/wp-json/julinemart/v1/password/reset`);

    const response = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, login, password }),
    });

    console.log('Response status:', response.status);

    const data = await response.json().catch(() => ({}));
    console.log('Response data:', data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to reset password' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}