import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 300;

function normalizeHeroSlides(content: unknown) {
  if (Array.isArray(content)) return content;
  if (content && typeof content === 'object' && Array.isArray((content as { slides?: unknown }).slides)) {
    return (content as { slides: unknown[] }).slides;
  }
  return null;
}

async function getSettingsFromSupabase(): Promise<Record<string, unknown> | null> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('key, content')
      .in('key', ['hero_slider', 'announcement_bar', 'banner', 'settings', 'hero_ads']);

    if (error || !data || data.length === 0) return null;

    const result: Record<string, unknown> = {};
    for (const row of data) {
      if (row.key === 'hero_slider') {
        const slides = normalizeHeroSlides(row.content);
        if (slides) result.sliders = slides;
        continue;
      }

      if (row.key === 'announcement_bar' || row.key === 'banner') {
        result.banner = row.content;
        continue;
      }

      if (row.key === 'hero_ads') {
        result.hero_ads = row.content;
        continue;
      }

      result[row.key] = row.content;
    }

    // Only return if we got at least sliders
    if (!result.sliders) return null;
    return result;
  } catch {
    return null;
  }
}

export async function GET() {
  const supabaseData = await getSettingsFromSupabase();
  if (supabaseData) {
    return NextResponse.json(supabaseData);
  }

  return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
}
