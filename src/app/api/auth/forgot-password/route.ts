import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

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

    console.log('Calling JulineMart password reset endpoint...');

    // Call our custom JulineMart endpoint
    const response = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    console.log('WordPress response:', response.status, data);

    if (response.ok) {
      return NextResponse.json({ 
        success: true,
        message: data.message || 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Even on error, return success for security (prevents email enumeration)
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password handler error:', error);
    // Return success for security
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
}