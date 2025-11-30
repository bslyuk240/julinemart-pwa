import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function POST(request: NextRequest) {
  try {
    const { key, login } = await request.json();

    if (!WP_URL) {
      console.error('NEXT_PUBLIC_WP_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    if (!key || !login) {
      return NextResponse.json(
        { valid: false, error: 'Missing key or login' },
        { status: 400 }
      );
    }

    console.log('=== Validate Reset Key ===');
    console.log('Login:', login);
    console.log('Key length:', key.length);

    const response = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/validate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, login }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { valid: false, error: data.message || 'Invalid or expired link' },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });

  } catch (error) {
    console.error('Validate key error:', error);
    return NextResponse.json(
      { valid: false, error: 'Failed to validate reset link' },
      { status: 500 }
    );
  }
}