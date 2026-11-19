import { NextResponse } from 'next/server';
import { getActiveCampaignSummaries } from '@/lib/campaigns/get-campaign';

// Rendered per request, with a short CDN cache we set ourselves. The old
// `revalidate = 60` made Next send `stale-while-revalidate` of about a year,
// so a quiet CDN edge could keep advertising a campaign that had already
// ended or been paused.
export const dynamic = 'force-dynamic';

export async function GET() {
  const campaigns = await getActiveCampaignSummaries();
  return NextResponse.json(
    { campaigns },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' } }
  );
}
