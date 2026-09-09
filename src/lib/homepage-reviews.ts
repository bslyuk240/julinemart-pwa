import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface HomepageReview {
  id: string;
  reviewerName: string;
  rating: number;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  productName?: string;
  productSlug?: string;
}

interface ReviewRow {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  verified_purchase: boolean;
  created_at: string;
  woo_product_id: number | null;
  product_id: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  slug: string | null;
  woo_product_id: number | null;
}

interface CampaignReviewRow {
  id: string;
  reviewer_name: string;
  rating: number;
  body: string;
  created_at: string;
}

/**
 * Approved feedback from giveaway/campaign entrants — a separate table from
 * product_reviews (that one requires a real product_id; a "how was the
 * giveaway" review has none), merged into the same homepage feed here so
 * reviews-carousel.tsx needs no changes at all. verifiedPurchase is always
 * true: these are real, ID-verified campaign entrants, just not product
 * buyers, so the badge still reads correctly on the card.
 */
async function getCampaignReviews(limit: number): Promise<HomepageReview[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('campaign_reviews')
    .select('id, reviewer_name, rating, body, created_at')
    .eq('status', 'approved')
    .gte('rating', 4)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];

  return (data as CampaignReviewRow[]).map((row) => ({
    id: row.id,
    reviewerName: row.reviewer_name,
    rating: row.rating,
    body: row.body,
    verifiedPurchase: true,
    createdAt: row.created_at,
  }));
}

export async function getHomepageReviews(limit = 16): Promise<HomepageReview[]> {
  const supabase = getSupabaseServerClient();

  const [{ data, error }, campaignReviews] = await Promise.all([
    supabase
      .from('product_reviews')
      .select('id, reviewer_name, rating, body, verified_purchase, created_at, woo_product_id, product_id')
      .eq('status', 'approved')
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(limit),
    getCampaignReviews(limit),
  ]);

  if (error && !campaignReviews.length) return [];

  const rows = (data || []) as ReviewRow[];
  const wooIds = [...new Set(rows.map((r) => r.woo_product_id).filter((id): id is number => id != null))];
  const productIds = [...new Set(rows.map((r) => r.product_id).filter((id): id is string => Boolean(id)))];

  const productByWoo = new Map<number, ProductRow>();
  const productById = new Map<string, ProductRow>();

  if (wooIds.length) {
    const { data: byWoo } = await supabase
      .from('products')
      .select('id, name, slug, woo_product_id')
      .in('woo_product_id', wooIds);
    for (const row of (byWoo as ProductRow[]) ?? []) {
      if (row.woo_product_id != null) productByWoo.set(row.woo_product_id, row);
    }
  }

  if (productIds.length) {
    const { data: byId } = await supabase
      .from('products')
      .select('id, name, slug, woo_product_id')
      .in('id', productIds);
    for (const row of (byId as ProductRow[]) ?? []) {
      productById.set(row.id, row);
    }
  }

  const productReviews = rows.map((row) => {
    const product =
      (row.product_id ? productById.get(row.product_id) : undefined) ??
      (row.woo_product_id != null ? productByWoo.get(row.woo_product_id) : undefined);

    return {
      id: row.id,
      reviewerName: row.reviewer_name,
      rating: row.rating,
      body: row.body,
      verifiedPurchase: row.verified_purchase,
      createdAt: row.created_at,
      productName: product?.name,
      productSlug: product?.slug ?? undefined,
    };
  });

  return [...productReviews, ...campaignReviews]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}
