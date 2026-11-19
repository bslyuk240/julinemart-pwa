import type { CampaignSummary } from '@/types/campaigns';

/**
 * Pages that list campaigns (the homepage strip and pop-up) are cached HTML,
 * so a campaign can outlive its end date there. Call this in the browser to
 * drop the ones that have ended since the page was built.
 */
export function filterLiveCampaigns(campaigns: CampaignSummary[], now = Date.now()): CampaignSummary[] {
  return campaigns.filter((c) => {
    if (!c.endDate) return true;
    const end = new Date(c.endDate).getTime();
    return !Number.isFinite(end) || end > now;
  });
}
