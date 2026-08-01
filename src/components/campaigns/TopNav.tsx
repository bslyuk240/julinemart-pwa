'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import CampaignShareButton from '@/components/campaigns/CampaignShareButton';

// Top Context Navigation Overlay from the UI Change Plan — replaces global
// site nav while on a campaign page. Sticky, matches the pattern already
// prototyped in the approved campaign-preview artifact.
export default function CampaignTopNav({
  campaignName,
  campaignSlug,
  shareDescription,
  shareImageUrl,
}: {
  campaignName: string;
  campaignSlug: string;
  shareDescription?: string;
  shareImageUrl?: string;
}) {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-2 border-b border-gray-100 bg-white px-3 py-3 shadow-sm sm:gap-3 sm:px-4">
      <Link
        href="/"
        className="flex min-h-[48px] items-center gap-1.5 text-sm font-bold text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Showcase</span>
      </Link>
      <span className="min-w-0 flex-1 truncate text-center text-sm font-extrabold text-primary-600">
        {campaignName}
      </span>
      <div className="flex items-center gap-1.5">
        <CampaignShareButton
          title={campaignName}
          description={shareDescription}
          slug={campaignSlug}
          imageUrl={shareImageUrl}
        />
        <Link
          href="/cart"
          className="relative flex min-h-[48px] items-center gap-1.5 rounded-full bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700 sm:px-4"
        >
          <ShoppingCart className="h-[17px] w-[17px]" />
          <span className="hidden sm:inline">Cart</span>
          {itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary-500 px-1 text-[10px] font-extrabold text-white">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
