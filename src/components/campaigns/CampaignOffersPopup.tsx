'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X, Sparkles } from 'lucide-react';
import type { CampaignSummary } from '@/types/campaigns';
import { safeStorage } from '@/lib/safe-storage';
import { CampaignOffersList } from '@/components/campaigns/CampaignOfferCard';

const DISMISSED_KEY = 'jm_campaign_offers_popup_dismissed';
const DISMISS_COOLDOWN_HOURS = 24;

interface CampaignOffersPopupProps {
  campaigns: CampaignSummary[];
}

function isDismissedRecently(): boolean {
  const raw = safeStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  if (Number.isNaN(dismissedAt)) return false;
  const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
  return hoursSince < DISMISS_COOLDOWN_HOURS;
}

export default function CampaignOffersPopup({ campaigns }: CampaignOffersPopupProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname !== '/' || campaigns.length === 0 || isDismissedRecently()) return;

    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname, campaigns.length]);

  if (!visible || campaigns.length === 0) return null;

  const dismiss = () => {
    safeStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-offers-title"
    >
      <div
        className="w-full max-w-md animate-in slide-in-from-bottom rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:slide-in-from-bottom-0 sm:zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 id="campaign-offers-title" className="text-lg font-extrabold text-gray-900">
                Campaign offers
              </h2>
              <p className="text-sm text-gray-500">Limited deals — tap to explore</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <CampaignOffersList campaigns={campaigns} />

        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-xl py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
