'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Ticket } from 'lucide-react';
import { offerConditions, offerHeadline } from '@/lib/campaigns/offer-copy';
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
  campaignTitle,
  endDate,
  offer,
  qrVariants = [],
}: {
  campaignId: string;
  campaignTitle: string;
  endDate?: string;
  offer?: CampaignOfferConfig;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [copied, setCopied] = useState(false);

  if (!offer?.couponCode) return null;
  const code = offer.couponCode.trim().toUpperCase();
  const conditions = offerConditions(offer, endDate);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      return true;
    } catch {
      toast.error(`Couldn't copy. Your code is ${code}`);
      return false;
    }
  }

  async function handleApplyAndShop() {
    savePendingCampaignVoucher(code);
    track('cta_click', { cta: 'apply_offer' });
    await copyCode();
    document.getElementById('campaign-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast.success(`${code} saved — it fills in at checkout`);
  }

  return (
    <section aria-label="Campaign offer" className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(16,24,40,0.12)] ring-1 ring-gray-200/70 md:flex-row">
      {/* Ticket body */}
      <div className="flex flex-1 items-start gap-4 p-5 sm:p-7">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
          <Ticket className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold text-gray-500">Your campaign code</p>
          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
            {offerHeadline(offer, campaignTitle)}
          </h2>
          {conditions && <p className="mt-1 text-sm text-gray-500">{conditions}</p>}
        </div>
      </div>

      {/* Stub, split from the body by a perforated edge */}
      <div className="flex flex-col items-stretch gap-3 border-t-2 border-dashed border-gray-200 bg-gray-50/80 p-5 sm:p-7 md:w-[340px] md:border-l-2 md:border-t-0">
        <button
          type="button"
          onClick={copyCode}
          className="group flex min-h-[52px] items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-4 text-left transition hover:border-gray-400"
        >
          <span className="truncate font-mono text-lg font-bold tracking-[0.12em] text-gray-900">
            <span className="sr-only">Copy code </span>
            {code}
          </span>
          <span className="flex flex-none items-center gap-1 text-xs font-semibold text-primary-600">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleApplyAndShop}
          className="min-h-[48px] rounded-full bg-secondary-500 px-6 text-sm font-bold text-gray-950 transition hover:bg-secondary-400"
        >
          Apply code &amp; shop
        </button>
        <p className="text-center text-xs text-gray-500">We&rsquo;ll fill it in for you at checkout.</p>
        <span role="status" className="sr-only">
          {copied ? 'Code copied' : ''}
        </span>
      </div>
    </section>
  );
}
