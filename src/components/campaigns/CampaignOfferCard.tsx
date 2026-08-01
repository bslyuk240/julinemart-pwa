import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Sparkles, Tag } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaigns';
import CampaignCountdown from '@/components/campaigns/CampaignCountdown';

function CampaignOfferThumb({
  campaign,
  compact,
}: {
  campaign: CampaignSummary;
  compact: boolean;
}) {
  const sizeClass = compact ? 'h-14 w-14' : 'h-16 w-16';

  return (
    <div className={`relative shrink-0 overflow-hidden rounded-xl bg-primary-100 ${sizeClass}`}>
      {campaign.heroImage ? (
        <Image
          src={campaign.heroImage}
          alt=""
          fill
          className="object-cover"
          sizes={compact ? '56px' : '64px'}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-primary-600">
          <Sparkles className="h-6 w-6" />
        </div>
      )}
      {campaign.endDate && (
        <div
          className="absolute inset-x-0 bottom-0 bg-black/75 px-0.5 py-px text-center"
          aria-label="Offer countdown"
        >
          <CampaignCountdown endDate={campaign.endDate} variant="micro" />
        </div>
      )}
    </div>
  );
}

export function CampaignOfferCard({
  campaign,
  compact = false,
}: {
  campaign: CampaignSummary;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className={`group flex shrink-0 items-center gap-3 rounded-2xl border border-primary-100 bg-gradient-to-r from-primary-50 to-white transition hover:border-primary-200 hover:shadow-md ${
        compact ? 'h-20 w-[260px] max-w-[260px] p-3' : 'w-full p-4'
      }`}
    >
      <CampaignOfferThumb campaign={campaign} compact={compact} />

      <div className="min-w-0 flex-1 overflow-hidden">
        {campaign.badgeText && (
          <span className="mb-0.5 inline-block rounded-full bg-secondary-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            {campaign.badgeText}
          </span>
        )}
        <p className={`truncate font-bold text-gray-900 ${compact ? 'text-sm' : 'text-base'}`}>
          {campaign.publicTitle}
        </p>
        {campaign.offerLabel && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs font-semibold text-secondary-600">
            <Tag className="h-3 w-3 shrink-0" />
            {campaign.offerLabel}
          </p>
        )}
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-primary-400 transition group-hover:translate-x-0.5 group-hover:text-primary-600" />
    </Link>
  );
}

export function CampaignOffersList({
  campaigns,
  compact = false,
}: {
  campaigns: CampaignSummary[];
  compact?: boolean;
}) {
  if (campaigns.length === 0) return null;

  return (
    <ul className={compact ? 'flex flex-col gap-2' : 'space-y-3'}>
      {campaigns.map((campaign) => (
        <li key={campaign.id}>
          <CampaignOfferCard campaign={campaign} compact={compact} />
        </li>
      ))}
    </ul>
  );
}
