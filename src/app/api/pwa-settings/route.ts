import { NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export async function GET() {
  try {
    console.log('📡 API Route: Fetching PWA settings from WordPress...');
    
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/settings`,
      {
        next: { revalidate: 300 }, // Cache for 5 minutes
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('❌ WordPress API error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Settings fetched successfully:', {
      sliders: data.sliders?.length || 0,
      banner: data.banner?.enabled ? 'enabled' : 'disabled',
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ Error fetching PWA settings:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}