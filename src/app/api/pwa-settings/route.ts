import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

export const revalidate = 300;

async function getSettingsFromSupabase(): Promise<Record<string, unknown> | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('key, value')
      .in('key', ['hero_slider', 'banner', 'settings']);

    if (error || !data || data.length === 0) return null;

    const result: Record<string, unknown> = {};
    for (const row of data) {
      result[row.key === 'hero_slider' ? 'sliders' : row.key] = row.value;
    }

    // Only return if we got at least sliders
    if (!result.sliders) return null;
    return result;
  } catch {
    return null;
  }
}

async function getSettingsFromWordPress(): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(
      `${WP_URL}/wp-json/julinemart-pwa/v1/settings`,
      {
        next: { revalidate: 300 },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  // Supabase-first
  const supabaseData = await getSettingsFromSupabase();
  if (supabaseData) {
    return NextResponse.json(supabaseData);
  }

  // WordPress fallback
  const wpData = await getSettingsFromWordPress();
  if (wpData) {
    return NextResponse.json(wpData);
  }

  return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
}
