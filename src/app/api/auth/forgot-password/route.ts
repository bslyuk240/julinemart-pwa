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

    // Build Basic Auth header for WooCommerce API
    const authHeader = WC_KEY && WC_SECRET
      ? `Basic ${Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')}`
      : null;

    // Try multiple endpoint approaches
    const endpoints = [
      // Custom JulineMart endpoint (recommended - requires WP plugin)
      {
        path: '/wp-json/julinemart/v1/password/forgot',
        body: { email },
        useAuth: true,
      },
      // Alternative: custom WooCommerce extension endpoint
      {
        path: '/wp-json/wc-password-reset/v1/forgot',
        body: { email },
        useAuth: true,
      },
      // Fallback: WordPress Application Passwords endpoint (if available)
      {
        path: '/wp-json/wp/v2/users/lost-password',
        body: { user_login: email },
        useAuth: false,
      },
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (endpoint.useAuth && authHeader) {
          headers.Authorization = authHeader;
        }

        const response = await fetch(`${WP_URL}${endpoint.path}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(endpoint.body),
        });

        if (response.ok) {
          // For security, always return success even if email doesn't exist
          return NextResponse.json({ 
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.'
          });
        }

        // Check for 404 (endpoint doesn't exist) vs actual error
        if (response.status === 404) {
          // Endpoint doesn't exist, try next one
          continue;
        }

        // Store error for potential use
        const errorData = await response.json().catch(() => ({}));
        lastError = errorData;

        // If it's a user-not-found type error, still return success for security
        if (
          response.status === 400 && 
          (errorData.code === 'user_not_found' || errorData.code === 'invalid_email')
        ) {
          return NextResponse.json({ 
            success: true,
            message: 'If an account exists with this email, you will receive a password reset link.'
          });
        }

      } catch (fetchError) {
        console.error(`Failed to call ${endpoint.path}:`, fetchError);
        continue;
      }
    }

    // All endpoints failed
    console.error('All password reset endpoints failed. Last error:', lastError);
    
    // For security, don't reveal that the request failed
    // This prevents email enumeration attacks
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });

  } catch (error) {
    console.error('Forgot password handler error:', error);
    // Even on error, return success for security
    return NextResponse.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  }
}