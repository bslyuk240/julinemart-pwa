import { Tag } from 'lucide-react';
import type { CampaignOfferConfig } from '@/types/campaigns';

export default function PromoBanner({ offerConfig }: { offerConfig?: CampaignOfferConfig }) {
  if (!offerConfig?.displayText && !offerConfig?.discountValue) return null;

  const label =
    offerConfig.displayText ??
    (offerConfig.discountType === 'percentage'
      ? `${offerConfig.discountValue}% off this campaign`
      : `Special offer on this campaign`);

  return (
    <div className="flex justify-center px-4 pt-4">
      <span className="inline-flex items-center gap-2 rounded-full bg-secondary-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-secondary-500/30">
        <Tag className="h-3.5 w-3.5" />
        {label}
      </span>
    </div>
  );
}
