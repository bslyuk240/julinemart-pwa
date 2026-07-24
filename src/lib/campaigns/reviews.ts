import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveCampaignProducts } from '@/lib/campaigns/products';
import type { Campaign, ReviewScope } from '@/types/campaigns';

// BE-203 — tiered review fallback engine. Priority order for `mixed` per the
// PRD: featured products -> vendor -> category. Each review carries an
// `attribution` tag so the frontend never shows a category/vendor review as
// if it were a specific product's review (Security doc + ReviewAttribution
// requirement).

export interface CampaignReview {
  id: string;
  reviewerName: string;
  rating: number;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  attribution: {
    matchedVia: 'product' | 'featured_products' | 'vendor' | 'category';
    label: string;
  };
}

interface ReviewRow {
  id: string;
  product_id: string | null;
  woo_product_id: number | null;
  vendor_id: string | null;
  reviewer_name: string;
  rating: number;
  body: string;
  status: string;
  verified_purchase: boolean;
  created_at: string;
}

async function getManualExclusions(campaignId: string): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('campaign_manual_exclusions')
    .select('entity_id')
    .eq('campaign_id', campaignId)
    .eq('entity_type', 'review');
  return new Set((data ?? []).map((r) => r.entity_id as string));
}

async function reviewsByWooProductIds(wooIds: number[], limit: number): Promise<ReviewRow[]> {
  if (!wooIds.length) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('status', 'approved')
    .in('woo_product_id', wooIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as ReviewRow[]) ?? [];
}

async function reviewsByProductUuids(productIds: string[], limit: number): Promise<ReviewRow[]> {
  if (!productIds.length) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('status', 'approved')
    .in('product_id', productIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as ReviewRow[]) ?? [];
}

async function reviewsByVendor(vendorId: string, limit: number): Promise<ReviewRow[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('status', 'approved')
    .eq('vendor_id', vendorId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as ReviewRow[]) ?? [];
}

async function productIdsForCategories(categoryIds: string[]): Promise<string[]> {
  if (!categoryIds.length) return [];
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('product_category_map')
    .select('product_id')
    .in('category_id', categoryIds);
  return (data ?? []).map((r) => r.product_id as string);
}

async function productNamesByWooId(wooIds: number[]): Promise<Map<number, string>> {
  if (!wooIds.length) return new Map();
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('products')
    .select('woo_product_id, name')
    .in('woo_product_id', wooIds);
  const map = new Map<number, string>();
  for (const row of data ?? []) {
    if (row.woo_product_id != null) map.set(row.woo_product_id, row.name);
  }
  return map;
}

function passesFilters(
  row: ReviewRow,
  exclusions: Set<string>,
  minimumRating: number,
  verifiedOnly: boolean
): boolean {
  if (exclusions.has(row.id)) return false;
  if (row.rating < minimumRating) return false;
  if (verifiedOnly && !row.verified_purchase) return false;
  return true;
}

function sortRows(rows: ReviewRow[], sort: 'newest' | 'highest_rated' | 'manual' | undefined): ReviewRow[] {
  if (sort === 'highest_rated') {
    return [...rows].sort((a, b) => b.rating - a.rating);
  }
  return rows; // already newest-first from the query's order()
}

export async function resolveCampaignReviews(
  campaign: Campaign
): Promise<{ reviews: CampaignReview[]; scopeUsed: ReviewScope }> {
  const rules = campaign.reviewRules;
  const maxReviews = rules.maxReviews ?? 5;
  const minimumRating = rules.minimumRating ?? 0;
  const verifiedOnly = rules.verifiedPurchaseOnly ?? false;
  const exclusions = await getManualExclusions(campaign.id);

  const seen = new Set<string>();
  const collected: { row: ReviewRow; matchedVia: CampaignReview['attribution']['matchedVia'] }[] = [];

  async function addTier(matchedVia: CampaignReview['attribution']['matchedVia'], rows: ReviewRow[]) {
    for (const row of rows) {
      if (collected.length >= maxReviews) return;
      if (seen.has(row.id)) continue;
      if (!passesFilters(row, exclusions, minimumRating, verifiedOnly)) continue;
      seen.add(row.id);
      collected.push({ row, matchedVia });
    }
  }

  // Sort BEFORE truncating, not after — addTier() stops collecting once it
  // hits maxReviews, so whatever order it sees is what "wins". Sorting only
  // the final output (previous bug) let arbitrary DB fetch order decide
  // survivors while `sort: 'highest_rated'` just reordered the losers.
  async function tierFeaturedProducts() {
    const { products } = await resolveCampaignProducts(campaign);
    const rows = await reviewsByWooProductIds(products.map((p) => p.id), maxReviews * 3);
    await addTier('featured_products', sortRows(rows, rules.sort));
  }

  async function tierVendor() {
    const vendorId =
      campaign.vendorOverride?.vendorId ?? (campaign.targetType === 'vendor' ? campaign.targetId : undefined);
    if (!vendorId) return;
    const rows = await reviewsByVendor(String(vendorId), maxReviews * 3);
    await addTier('vendor', sortRows(rows, rules.sort));
  }

  async function tierCategory() {
    const categoryIds = campaign.productSelectionRules.categoryIds?.map(String) ?? [];
    if (!categoryIds.length) return;
    const productIds = await productIdsForCategories(categoryIds);
    const rows = await reviewsByProductUuids(productIds, maxReviews * 3);
    await addTier('category', sortRows(rows, rules.sort));
  }

  async function tierProduct() {
    if (campaign.targetType !== 'product' || !campaign.targetId) return;
    const rows = await reviewsByProductUuids([campaign.targetId], maxReviews * 3);
    await addTier('product', sortRows(rows, rules.sort));
  }

  if (rules.scope === 'mixed') {
    // PRD priority order: featured products -> vendor -> category
    await tierFeaturedProducts();
    if (collected.length < maxReviews) await tierVendor();
    if (collected.length < maxReviews) await tierCategory();
  } else {
    if (rules.scope === 'product') await tierProduct();
    if (rules.scope === 'featured_products') await tierFeaturedProducts();
    if (rules.scope === 'vendor') await tierVendor();
    if (rules.scope === 'category') await tierCategory();

    // Single-scope fallback when the primary tier came up short.
    if (collected.length < maxReviews && rules.fallbackScope) {
      if (rules.fallbackScope === 'featured_products') await tierFeaturedProducts();
      if (rules.fallbackScope === 'vendor') await tierVendor();
      if (rules.fallbackScope === 'category') await tierCategory();
      if (rules.fallbackScope === 'product') await tierProduct();
    }
  }

  const sorted = sortRows(
    collected.map((c) => c.row),
    rules.sort
  );

  const wooIdsNeeded = collected
    .filter((c) => c.matchedVia === 'product' || c.matchedVia === 'featured_products')
    .map((c) => c.row.woo_product_id)
    .filter((id): id is number => id != null);
  const productNames = await productNamesByWooId(wooIdsNeeded);

  const byId = new Map(collected.map((c) => [c.row.id, c]));

  const reviews: CampaignReview[] = sorted.map((row) => {
    const entry = byId.get(row.id)!;
    let label: string;
    switch (entry.matchedVia) {
      case 'product':
      case 'featured_products': {
        const name = row.woo_product_id != null ? productNames.get(row.woo_product_id) : undefined;
        label = `Review of ${name ?? 'a featured product'}`;
        break;
      }
      case 'vendor':
        label = `Review of ${campaign.vendorOverride?.name ?? 'the vendor'}`;
        break;
      case 'category':
        label = 'Review from this category';
        break;
    }
    return {
      id: row.id,
      reviewerName: row.reviewer_name,
      rating: row.rating,
      body: row.body,
      verifiedPurchase: row.verified_purchase,
      createdAt: row.created_at,
      attribution: { matchedVia: entry.matchedVia, label },
    };
  });

  return { reviews, scopeUsed: rules.scope };
}
