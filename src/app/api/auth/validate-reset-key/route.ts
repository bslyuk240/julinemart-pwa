import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function POST(request: NextRequest) {
  try {
    const { key, login } = await request.json();
    
    if (!WP_URL) {
      // If no WP URL, skip validation and let reset handle it
      return NextResponse.json({ valid: true });
    }
    
    if (!key || !login) {
      return NextResponse.json(
        { error: 'Invalid reset link' },
        { status: 400 }
      );
    }

    // Try to validate the key via WordPress endpoint
    try {
      const response = await fetch(
        `${WP_URL}/wp-json/julinemart/v1/password/validate-key`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key, login }),
        }
      );

      if (response.ok) {
        return NextResponse.json({ valid: true });
      }

      // Check for 404 (endpoint doesn't exist)
      if (response.status === 404) {
        // Endpoint doesn't exist, assume valid and let reset handle validation
        return NextResponse.json({ valid: true });
      }

      const data = await response.json().catch(() => ({}));
      
      let errorMessage = 'Invalid or expired reset link';
      if (data.code === 'expired_key') {
        errorMessage = 'This reset link has expired. Please request a new one.';
      } else if (data.message) {
        errorMessage = data.message;
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    } catch (fetchError) {
      // If fetch fails, assume valid and let reset handle it
      console.warn('Key validation fetch failed:', fetchError);
      return NextResponse.json({ valid: true });
    }

  } catch (error) {
    console.error('Validate reset key error:', error);
    // On error, assume valid and let reset handle it
    return NextResponse.json({ valid: true });
  }
}