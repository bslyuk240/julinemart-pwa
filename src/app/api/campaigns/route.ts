import { NextResponse } from 'next/server';
import { getActiveCampaignSummaries } from '@/lib/campaigns/get-campaign';

export const revalidate = 60;

export async function GET() {
  const campaigns = await getActiveCampaignSummaries();
  return NextResponse.json({ campaigns });
}
