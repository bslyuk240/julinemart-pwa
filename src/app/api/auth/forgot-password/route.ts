import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!WP_URL) {
      console.error('NEXT_PUBLIC_WP_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log('=== Password Reset Request ===');
    console.log('Email:', email);
    console.log('Calling:', `${WP_URL}/wp-json/julinemart/v1/password/forgot`);

    // Call our custom JulineMart password reset endpoint
    const response = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    console.log('Response status:', response.status);
    
    const data = await response.json().catch(() => ({}));
    console.log('Response data:', data);

    // Always return success to prevent email enumeration
    // The WordPress plugin also returns success regardless of whether email exists
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    // Still return success for security
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
}