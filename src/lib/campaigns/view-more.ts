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

  if (
    campaign.targetType === 'category' ||
    (rules.categoryIds && rules.categoryIds.length > 0)
  ) {
    const category =
      products.find((p) => p.categories?.length)?.categories?.[0] ??
      products.flatMap((p) => p.categories ?? []).find(Boolean);

    if (category?.slug) {
      return {
        href: `/category/${encodeURIComponent(category.slug)}`,
        label: `View more in ${category.name || 'this category'}`,
      };
    }
  }

  if (campaign.targetType === 'general' || campaign.targetType === 'collection') {
    return { href: '/products', label: 'Browse more products' };
  }

  // Manual / product / multi_vendor: try first product category, else catalog.
  const fallbackCategory = products.find((p) => p.categories?.length)?.categories?.[0];
  if (fallbackCategory?.slug) {
    return {
      href: `/category/${encodeURIComponent(fallbackCategory.slug)}`,
      label: `View more in ${fallbackCategory.name || 'this category'}`,
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
