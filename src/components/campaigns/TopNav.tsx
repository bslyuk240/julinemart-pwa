'use client';

import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';

// Top Context Navigation Overlay from the UI Change Plan — replaces global
// site nav while on a campaign page. Sticky, matches the pattern already
// prototyped in the approved campaign-preview artifact.
export default function CampaignTopNav({ campaignName }: { campaignName: string }) {
  const itemCount = useCartStore((s) => s.itemCount);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
      <Link
        href="/"
        className="flex min-h-[48px] items-center gap-1.5 text-sm font-bold text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back to Showcase</span>
      </Link>
      <span className="truncate text-sm font-extrabold text-primary-600">{campaignName}</span>
      <Link
        href="/cart"
        className="relative flex min-h-[48px] items-center gap-1.5 rounded-full bg-primary-50 px-4 py-2 text-xs font-bold text-primary-700"
      >
        <ShoppingCart className="h-[17px] w-[17px]" />
        <span className="hidden sm:inline">Cart</span>
        {itemCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary-500 px-1 text-[10px] font-extrabold text-white">
            {itemCount}
          </span>
        )}
      </Link>
    </header>
  );
}
