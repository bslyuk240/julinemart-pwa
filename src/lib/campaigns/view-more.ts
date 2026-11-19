import type { Campaign } from '@/types/campaigns';

/** Storefront vendor pages are `/vendor/[id]`. Normalize bare `/10` / `10` typos. */
export function resolveVendorStoreHref(url?: string): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/vendor/')) return raw;
  const id = raw.replace(/^\//, '');
  return id ? `/vendor/${encodeURIComponent(id)}` : undefined;
}

export type CampaignViewMoreLink = {
  href: string;
  label: string;
};

/** Where the full, paginated list of a campaign's products lives. */
export function campaignProductsHref(campaignSlug: string, page = 1): string {
  const base = `/campaigns/${encodeURIComponent(campaignSlug)}/products`;
  return page > 1 ? `${base}?page=${page}` : base;
}

/**
 * "View more" opens the campaign's own full product list (paginated), i.e. every product its rules match, not a
 * vendor store, a category or the whole catalogue. It only appears when there is more than the preview shows.
 */
export function resolveCampaignViewMore(
  campaign: Pick<Campaign, 'slug'>,
  shownCount: number,
  total: number
): CampaignViewMoreLink | null {
  if (!(total > shownCount)) return null;
  return { href: campaignProductsHref(campaign.slug), label: `View all ${total} products` };
}

export function buildCampaignProductHref(
  slug: string,
  campaignSlug: string,
  campaignTitle: string,
  offerText?: string
): string {
  const params = new URLSearchParams({
    from_campaign: campaignSlug,
    from_campaign_title: campaignTitle,
  });
  if (offerText) params.set('from_campaign_offer', offerText);
  return `/product/${encodeURIComponent(slug)}?${params.toString()}`;
}
