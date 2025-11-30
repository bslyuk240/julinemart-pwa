import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY = process.env.NEXT_PUBLIC_WC_KEY;
const WC_SECRET = process.env.NEXT_PUBLIC_WC_SECRET;

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

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
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
        path: '/wp-json/julinemart/v1/password/reset',
        body: { key, login, password },
        useAuth: true,
      },
      // Alternative: custom WooCommerce extension endpoint
      {
        path: '/wp-json/wc-password-reset/v1/reset',
        body: { key, login, password },
        useAuth: true,
      },
      // WordPress standard format (some plugins use this)
      {
        path: '/wp-json/wp/v2/users/reset-password',
        body: { key, login, password },
        useAuth: false,
      },
    ];

    let lastError: any = null;
    let lastStatus = 500;

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
          const data = await response.json().catch(() => ({}));
          return NextResponse.json({ 
            success: true,
            message: data.message || 'Password reset successfully!'
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
        lastStatus = response.status;

        // If we get a specific error, don't try other endpoints
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          break;
        }

      } catch (fetchError) {
        console.error(`Failed to call ${endpoint.path}:`, fetchError);
        continue;
      }
    }

    // All endpoints failed or returned an error
    console.error('Password reset failed. Last error:', lastError);
    
    // Determine appropriate error message
    let errorMessage = 'Failed to reset password. Please try again.';
    
    if (lastError) {
      if (lastError.code === 'invalid_key' || lastError.code === 'expired_key') {
        errorMessage = 'This password reset link has expired or is invalid. Please request a new one.';
      } else if (lastError.code === 'invalid_login' || lastError.code === 'user_not_found') {
        errorMessage = 'Invalid reset link. Please request a new password reset.';
      } else if (lastError.message) {
        errorMessage = lastError.message;
      } else if (lastError.error) {
        errorMessage = lastError.error;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 400 }
    );

  } catch (error) {
    console.error('Reset password handler error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}