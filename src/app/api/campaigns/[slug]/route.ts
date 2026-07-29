import { NextResponse } from 'next/server';
import { getCampaignBySlug } from '@/lib/campaigns/get-campaign';

// BE-201 — resolves a published campaign + its ordered, visible sections.
// Draft/scheduled/paused/expired/archived campaigns 404 here on purpose
// (matches Test Plan §4: "request draft campaign using valid slug -> 404").
// Admin preview of non-active campaigns is a separate route (BE-201 note in
// docs/campaigns-build-plan.md Phase 2) — not implemented yet.
export const revalidate = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const campaign = await getCampaignBySlug(slug, { requireActive: true });
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}
