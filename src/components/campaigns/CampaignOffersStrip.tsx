import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { getActiveCampaignSummaries } from '@/lib/campaigns/get-campaign';
import { CampaignOfferCard } from '@/components/campaigns/CampaignOfferCard';
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

  return (
    <section className="border-b border-primary-100 bg-white py-3 md:py-4">
      <div className="container-custom min-w-0">
        <div className="mb-2 flex items-center justify-between md:mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-secondary-500 md:h-5 md:w-5" />
            <h2 className="text-sm font-bold text-primary-900 md:text-base">Live campaign offers</h2>
          </div>
          {campaigns.length > 1 && (
            <Link
              href={`/campaigns/${campaigns[0].slug}`}
              className="flex items-center gap-0.5 text-xs font-medium text-secondary-500 hover:text-secondary-600 md:text-sm"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-nowrap gap-3 pb-1">
            {campaigns.map((campaign) => (
              <CampaignOfferCard key={campaign.id} campaign={campaign} compact />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
