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
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-offers-title"
      onClick={dismiss}
    >
      <div className="flex min-h-full items-center justify-center p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--jm-vv-bottom-inset,0px)+1rem)] sm:pb-4">
        <div
          className="flex w-full max-w-md max-h-[min(85dvh,calc(100dvh-4rem-env(safe-area-inset-bottom,0px)-var(--jm-vv-bottom-inset,0px)-2rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl animate-in zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-gray-100 p-5 pb-4">
            <div className="flex items-start justify-between gap-3">
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
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">
            <CampaignOffersList campaigns={campaigns} />
          </div>

          <div className="shrink-0 border-t border-gray-100 p-5 pt-3">
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
