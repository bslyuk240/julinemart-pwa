import { cache } from 'react';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Homepage settings edited in JLO admin (Homepage Content), stored in the Supabase
// `homepage_content` table. Read once per render on the server, so the hero, the
// phone promo strip and the ad carousel share one query and render with the HTML.

export type PwaSettings = {
  sliders?: unknown[];
  banner?: Record<string, unknown>;
  hero_ads?: unknown;
  [key: string]: unknown;
};

export type HeroAd = {
  type?: 'image' | 'video';
  image_url: string;
  video_url?: string;
  link: string;
};

export type HeroAdLists = { left: HeroAd[]; right: HeroAd[] };

function normalizeHeroSlides(content: unknown) {
  if (Array.isArray(content)) return content;
  if (content && typeof content === 'object' && Array.isArray((content as { slides?: unknown }).slides)) {
    return (content as { slides: unknown[] }).slides;
  }
  return null;
}

export const getPwaSettings = cache(async (): Promise<PwaSettings | null> => {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('key, content')
      .in('key', ['hero_slider', 'announcement_bar', 'banner', 'settings', 'hero_ads']);

    if (error || !data || data.length === 0) return null;

    const result: PwaSettings = {};
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
    return result;
  } catch {
    return null;
  }
});

function toHeroAd(value: unknown): HeroAd | null {
  if (!value || typeof value !== 'object') return null;
  const ad = value as Record<string, unknown>;
  const imageUrl = typeof ad.image_url === 'string' ? ad.image_url.trim() : '';
  const videoUrl = typeof ad.video_url === 'string' ? ad.video_url.trim() : '';
  // Shown as a video only when it has one (its image is then the poster); otherwise it needs an image.
  if (!imageUrl && !(ad.type === 'video' && videoUrl)) return null;
  return {
    type: ad.type === 'video' && videoUrl ? 'video' : 'image',
    image_url: imageUrl,
    video_url: videoUrl || undefined,
    link: typeof ad.link === 'string' ? ad.link.trim() : '',
  };
}

/**
 * Each side panel holds a list of ads. Older rows store one ad object per side;
 * newer ones store an array. Both read the same way here.
 */
export function normalizeHeroAds(raw: unknown): HeroAdLists {
  const side = (value: unknown) =>
    (Array.isArray(value) ? value : [value]).map(toHeroAd).filter((ad): ad is HeroAd => ad !== null);
  const ads = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { left: side(ads.left), right: side(ads.right) };
}

export type HomeBanner = { enabled: boolean; text: string; link: string };

function safeLink(value: unknown): string {
  if (typeof value !== 'string') return '';
  const link = value.trim();
  if (link.startsWith('/') && !link.startsWith('//')) return link;
  return /^https?:\/\//i.test(link) ? link : '';
}

/** The announcement bar from JLO admin, read from pwa-settings `banner`. */
export function toHomeBanner(raw: unknown): HomeBanner {
  const banner = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: banner.enabled !== false,
    text: typeof banner.text === 'string' ? banner.text.trim() : '',
    link: safeLink(banner.link),
  };
}
