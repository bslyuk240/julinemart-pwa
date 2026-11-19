'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { CampaignOfferConfig } from '@/types/campaigns';
import { offerHeadline } from '@/lib/campaigns/offer-copy';

// StickyOfferFloatingBar (UI Change Plan / New Components) — mobile only.
// isDismissed collapses to a small reopenable pill; copied gives tap-to-copy
// feedback. Matches the props/states named in the PRD's component spec.
export default function StickyOfferBar({
  offer,
  campaignTitle,
}: {
  offer?: CampaignOfferConfig;
  campaignTitle: string;
}) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!offer?.couponCode) return null;
  // The countdown already sits in the sticky top bar, so this bar only carries the code.
  const headline = offerHeadline(offer, campaignTitle);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(offer!.couponCode!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(`Couldn't copy. Your code is ${offer!.couponCode}`);
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center rounded-t-2xl border-t border-gray-100 bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] sm:hidden">
      {isDismissed ? (
        <button
          onClick={() => setIsDismissed(false)}
          className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-secondary-500 px-4 text-xs font-extrabold text-gray-950"
        >
          {headline} <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs text-gray-500">{headline}</p>
            <span className="inline-block rounded-md border border-dashed border-gray-300 px-2 py-0.5 font-mono text-sm font-bold tracking-[0.1em] text-gray-900">
              {offer.couponCode}
            </span>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              onClick={handleCopy}
              className="min-h-[48px] rounded-full bg-gray-900 px-5 text-sm font-bold text-white"
            >
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <span role="status" className="sr-only">
              {copied ? 'Code copied' : ''}
            </span>
            <button
              onClick={() => setIsDismissed(true)}
              aria-label="Dismiss offer bar"
              className="flex h-12 w-12 flex-none items-center justify-center text-gray-400"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
