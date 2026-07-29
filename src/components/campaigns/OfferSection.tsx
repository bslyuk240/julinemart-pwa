'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { CampaignOfferConfig } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';

/** Checkout reads this to prefill the campaign voucher field. */
export const PENDING_CAMPAIGN_VOUCHER_KEY = 'julinemart_pending_campaign_voucher';

export function savePendingCampaignVoucher(code: string) {
  try {
    sessionStorage.setItem(PENDING_CAMPAIGN_VOUCHER_KEY, code.trim().toUpperCase());
  } catch {
    // private mode / blocked storage — copy still works
  }
}

export function readPendingCampaignVoucher(): string | null {
  try {
    const value = sessionStorage.getItem(PENDING_CAMPAIGN_VOUCHER_KEY);
    return value?.trim() ? value.trim().toUpperCase() : null;
  } catch {
    return null;
  }
}

export function clearPendingCampaignVoucher() {
  try {
    sessionStorage.removeItem(PENDING_CAMPAIGN_VOUCHER_KEY);
  } catch {
    // ignore
  }
}

export default function OfferSection({
  campaignId,
  offer,
  qrVariants = [],
}: {
  campaignId: string;
  offer?: CampaignOfferConfig;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [copied, setCopied] = useState(false);

  if (!offer?.couponCode) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(offer!.couponCode!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable — user can still read the code.
    }
  }

  async function handleApplyAndShop() {
    const code = offer!.couponCode!.trim().toUpperCase();
    savePendingCampaignVoucher(code);
    track('cta_click', { cta: 'apply_offer' });

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // copy optional
    }

    const products = document.getElementById('campaign-products');
    if (products) {
      products.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    toast.success(`${code} saved — add products, then it prefills at checkout`);
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
        <div className="text-center sm:text-left">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-primary-100">
            Campaign offer
          </p>
          <h2 className="mb-1 text-xl font-extrabold sm:text-2xl">
            {offer.displayText ?? 'Special offer on this campaign'}
          </h2>
          {(offer.minimumSpend || offer.expirationDate) && (
            <p className="text-sm text-primary-100">
              {offer.minimumSpend && `Min. spend ₦${offer.minimumSpend.toLocaleString('en-NG')}`}
              {offer.minimumSpend && offer.expirationDate && ' · '}
              {offer.expirationDate && `ends ${new Date(offer.expirationDate).toLocaleDateString()}`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex h-32 w-32 flex-none flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-br from-secondary-500 to-secondary-700 shadow-lg shadow-secondary-500/40 transition hover:scale-105"
        >
          <span className="font-mono text-base font-extrabold tracking-wide">{offer.couponCode}</span>
          <span className="text-[10px] uppercase tracking-wide opacity-90">
            {copied ? 'copied!' : 'tap to copy'}
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={handleApplyAndShop}
        className="mt-6 min-h-[48px] w-full rounded-full bg-white px-6 text-sm font-extrabold text-primary-700 sm:w-auto sm:px-8"
      >
        Save offer &amp; shop
      </button>
      <p className="mt-2 text-center text-xs text-primary-100 sm:text-left">
        Saves the code for checkout, then scrolls to products.
      </p>
    </section>
  );
}
