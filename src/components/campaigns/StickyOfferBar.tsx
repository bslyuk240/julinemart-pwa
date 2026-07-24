'use client';

import { useState } from 'react';
import { X, ArrowRight } from 'lucide-react';
import type { CampaignOfferConfig } from '@/types/campaigns';

// StickyOfferFloatingBar (UI Change Plan / New Components) — mobile only.
// isDismissed collapses to a small reopenable pill; copied gives tap-to-copy
// feedback. Matches the props/states named in the PRD's component spec.
export default function StickyOfferBar({ offer }: { offer?: CampaignOfferConfig }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!offer?.couponCode) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(offer!.couponCode!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — the offer section above still shows the code.
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center rounded-t-2xl border-t border-gray-100 bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] sm:hidden">
      {isDismissed ? (
        <button
          onClick={() => setIsDismissed(false)}
          className="flex min-h-[48px] items-center gap-1.5 rounded-full bg-secondary-500 px-4 text-xs font-extrabold text-white"
        >
          {offer.displayText ?? 'Offer available'} <ArrowRight className="h-3 w-3" />
        </button>
      ) : (
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-mono text-sm font-extrabold text-primary-600">{offer.couponCode}</span>
            <p className="truncate text-[11px] text-gray-500">{offer.displayText}</p>
          </div>
          <div className="flex flex-none items-center gap-2">
            <button
              onClick={handleCopy}
              className="min-h-[48px] rounded-full bg-primary-600 px-4 text-xs font-extrabold text-white"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
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
