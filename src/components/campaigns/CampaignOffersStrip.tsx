import { getActiveCampaignSummaries } from '@/lib/campaigns/get-campaign';
import CampaignOffersStripView from '@/components/campaigns/CampaignOffersStripView';
import type { CampaignSummary } from '@/types/campaigns';

const CAMPAIGNS_ENABLED = process.env.FEATURE_CAMPAIGNS_ENABLED === 'true';

export default async function CampaignOffersStrip({
  campaigns: campaignsProp,
}: {
  campaigns?: CampaignSummary[];
} = {}) {
  if (!CAMPAIGNS_ENABLED) return null;

  const campaigns = campaignsProp ?? (await getActiveCampaignSummaries());
  if (campaigns.length === 0) return null;

  return <CampaignOffersStripView campaigns={campaigns} />;
}
