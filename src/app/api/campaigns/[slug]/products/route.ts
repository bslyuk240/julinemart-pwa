import { NextResponse } from 'next/server';
import { getCampaignBySlug } from '@/lib/campaigns/get-campaign';
import { resolveCampaignProducts } from '@/lib/campaigns/products';

// BE-202 — product rules engine over the existing JLO catalog client
// (Supabase-backed, WooCommerce fallback — see docs/campaigns-build-plan.md
// Appendix C). Not a direct WooCommerce integration as the PRD assumed.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const campaign = await getCampaignBySlug(slug, { requireActive: true });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const { products, total, source } = await resolveCampaignProducts(campaign);
  return NextResponse.json({ products, meta: { total, source } });
}
