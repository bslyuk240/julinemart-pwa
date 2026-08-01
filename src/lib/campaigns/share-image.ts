import type { CampaignHeroConfig } from '@/types/campaigns';

const DEFAULT_SITE_URL = 'https://julinemart.com';

/** Turn a relative asset path into an absolute URL for OG / share previews. */
export function toAbsoluteShareImageUrl(
  imageUrl: string | undefined | null,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
): string | undefined {
  const trimmed = imageUrl?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = siteUrl.replace(/\/$/, '');
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

/** Campaign share thumbnail: mobile hero banner, then JulineMart logo. */
export function getCampaignShareImageUrl(
  heroConfig: Pick<CampaignHeroConfig, 'heroImageMobile'>,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL,
): string {
  const fromHero = toAbsoluteShareImageUrl(heroConfig.heroImageMobile, siteUrl);
  if (fromHero) return fromHero;

  const logo =
    process.env.NEXT_PUBLIC_LOGO_URL?.trim() || '/images/logo.png';
  return toAbsoluteShareImageUrl(logo, siteUrl) ?? `${siteUrl.replace(/\/$/, '')}/images/logo.png`;
}
