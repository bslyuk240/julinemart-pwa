import { NextResponse } from 'next/server';
import { getCampaignBySlug } from '@/lib/campaigns/get-campaign';
import { resolveCampaignReviews } from '@/lib/campaigns/reviews';

// BE-203 — fallback-tiered review proxy, reads Supabase `product_reviews`
// directly (no WooCommerce involvement — reviews are Supabase-native here).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const campaign = await getCampaignBySlug(slug, { requireActive: true });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const { reviews, scopeUsed } = await resolveCampaignReviews(campaign);
  return NextResponse.json({ reviews, meta: { scopeUsed, count: reviews.length } });
}
