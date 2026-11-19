'use client';

import Link from 'next/link';
import { ArrowLeft, Clock, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import CampaignShareButton from '@/components/campaigns/CampaignShareButton';
import CampaignCountdown from '@/components/campaigns/CampaignCountdown';

// Top Context Navigation Overlay from the UI Change Plan — replaces global
// site nav while on a campaign page. Sticky. The countdown lives here (under
// the title) so it stays visible while shoppers scroll the products, instead
// of a separate banner card at the top of the page.
export default function CampaignTopNav({
  campaignName,
  campaignSlug,
  endDate,
  shareDescription,
  shareImageUrl,
}: {
  campaignName: string;
  campaignSlug: string;
  endDate?: string;
  shareDescription?: string;
  shareImageUrl?: string;
}) {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        <Link
          href="/"
          aria-label="Back to JulineMart"
          className="flex min-h-[44px] min-w-[44px] flex-none items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">JulineMart</span>
        </Link>

        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <span className="w-full truncate text-sm font-bold text-gray-900">{campaignName}</span>
          {endDate && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-secondary-800" aria-hidden />
              <CampaignCountdown endDate={endDate} variant="compact" inline />
            </span>
          )}
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <CampaignShareButton
            title={campaignName}
            description={shareDescription}
            slug={campaignSlug}
            imageUrl={shareImageUrl}
          />
          <Link
            href="/cart"
            aria-label={itemCount > 0 ? `Cart, ${itemCount} items` : 'Cart'}
            className="relative flex min-h-[44px] items-center gap-1.5 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-200 sm:px-4"
          >
            <ShoppingCart className="h-[17px] w-[17px]" />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary-500 px-1 text-[10px] font-bold text-gray-950">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
