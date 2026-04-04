import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

async function fetchFromSupabase() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('key, content')
      .eq('is_active', true)
      .in('key', ['hero_slider', 'announcement_bar']);

    if (error || !data || data.length === 0) return null;

    const sliderRow = data.find((r: any) => r.key === 'hero_slider');
    const bannerRow = data.find((r: any) => r.key === 'announcement_bar');

    const sliders = sliderRow?.content?.slides ?? [];
    const banner = bannerRow?.content ?? { enabled: false, text: '' };

    // Only return Supabase data if slider content exists
    if (sliders.length === 0) return null;

    return { sliders, banner };
  } catch {
    return null;
  }
}

async function fetchFromWordPress() {
  if (!WP_URL) return null;
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/settings`,
      {
        next: { revalidate: 300 },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  // Try Supabase homepage_content first
  const supabaseData = await fetchFromSupabase();
  if (supabaseData) {
    return NextResponse.json(supabaseData);
  }

  // Fall back to WordPress plugin
  const wpData = await fetchFromWordPress();
  if (wpData) {
    return NextResponse.json(wpData);
  }

  return NextResponse.json(
    { error: 'Failed to fetch settings' },
    { status: 503 }
  );
}