import type { Campaign } from '@/types/campaigns';
import type { Product } from '@/types/product';

/** Storefront vendor pages are `/vendor/[id]`. Normalize bare `/10` / `10` typos. */
export function resolveVendorStoreHref(url?: string): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/vendor/')) return raw;
  const id = raw.replace(/^\//, '');
  return id ? `/vendor/${encodeURIComponent(id)}` : undefined;
}

/** The first category that every product belongs to, if any. */
function sharedCategory(products: Product[]): { name: string; slug: string } | null {
  if (!products.length) return null;
  const [first, ...rest] = products;
  for (const cat of first.categories ?? []) {
    if (!cat?.slug) continue;
    if (rest.every((p) => (p.categories ?? []).some((c) => c?.slug === cat.slug))) {
      return { name: cat.name, slug: cat.slug };
    }
  }
  return null;
}

export type CampaignViewMoreLink = {
  href: string;
  label: string;
};

/**
 * Build a "view more products" destination from campaign targeting
 * (vendor store / category / general catalog).
 */
export function resolveCampaignViewMore(
  campaign: Campaign,
  products: Product[]
): CampaignViewMoreLink | null {
  const rules = campaign.productSelectionRules;
  const vendor = campaign.vendorOverride;

  const vendorHref =
    resolveVendorStoreHref(vendor?.storeLinkUrl) ??
    (vendor?.vendorId != null
      ? `/vendor/${encodeURIComponent(String(vendor.vendorId))}`
      : undefined) ??
    (campaign.targetType === 'vendor' && campaign.targetId
      ? `/vendor/${encodeURIComponent(campaign.targetId)}`
      : undefined) ??
    (rules.vendorId != null
      ? `/vendor/${encodeURIComponent(String(rules.vendorId))}`
      : undefined);

  if (vendorHref) {
    const name = vendor?.name?.trim() || 'this store';
    return { href: vendorHref, label: `View more from ${name}` };
  }

  // Only name a category when every campaign product is in it. A mixed grid
  // (watches, hair care, sofas) must not be labelled "View more in Watches".
  const category = sharedCategory(products);
  if (category) {
    return {
      href: `/category/${encodeURIComponent(category.slug)}`,
      label: `View more in ${category.name || 'this category'}`,
    };
  }

  return { href: '/products', label: 'Browse more products' };
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
