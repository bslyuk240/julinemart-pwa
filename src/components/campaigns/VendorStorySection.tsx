'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, ArrowRight } from 'lucide-react';
import type { CampaignVendorOverride } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';
import CampaignLightbox from '@/components/campaigns/CampaignLightbox';

/** Storefront vendor pages are `/vendor/[id]`. Normalize bare `/10` / `10` typos. */
function resolveVendorStoreHref(url?: string): string | undefined {
  const raw = url?.trim();
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/vendor/')) return raw;
  const id = raw.replace(/^\//, '');
  return id ? `/vendor/${encodeURIComponent(id)}` : undefined;
}

export default function VendorStorySection({
  campaignId,
  vendor,
  qrVariants = [],
}: {
  campaignId: string;
  vendor?: CampaignVendorOverride;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [videoOpen, setVideoOpen] = useState(false);
  if (!vendor) return null;
  // A vendor override with no name, story or media is an empty card. Skip it.
  if (!vendor.name?.trim() && !vendor.story?.trim() && !vendor.shopImageUrl && !vendor.introVideoUrl) {
    return null;
  }

  const storeHref = resolveVendorStoreHref(vendor.storeLinkUrl);

  return (
    <section className="grid gap-8 rounded-3xl bg-white p-6 ring-1 ring-gray-200/70 sm:p-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-500">Meet the vendor</p>
        {vendor.name && <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-gray-900">{vendor.name}</h2>}
        {vendor.story && <p className="mb-6 max-w-prose text-sm text-gray-600">{vendor.story}</p>}
        {vendor.yearsOperating != null && (
          <div className="mb-6 flex gap-8">
            <div>
              <strong className="block font-mono text-xl font-extrabold text-gray-900">
                {vendor.yearsOperating}
              </strong>
              <span className="text-xs text-gray-500">years trading</span>
            </div>
          </div>
        )}
        {storeHref && (
          <a
            href={storeHref}
            onClick={() => track('cta_click', { cta: 'visit_store' })}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gray-900 underline-offset-4 hover:underline"
          >
            {vendor.name ? <>Visit {vendor.name}&rsquo;s full store</> : <>Visit the full store</>} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {vendor.introVideoUrl ? (
        <button
          type="button"
          onClick={() => {
            setVideoOpen(true);
            track('video_view');
          }}
          className="relative flex aspect-video w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white shadow-md"
        >
          {vendor.shopImageUrl && (
            <Image src={vendor.shopImageUrl} alt={`${vendor.name} shop`} fill className="object-cover opacity-50" />
          )}
          <span className="relative z-10 rounded-full bg-secondary-500 p-3.5">
            <Play className="h-5 w-5" />
          </span>
          <span className="relative z-10 text-xs">Vendor introduction</span>
        </button>
      ) : (
        vendor.shopImageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-md">
            <Image src={vendor.shopImageUrl} alt={`${vendor.name} shop`} fill className="object-cover" />
          </div>
        )
      )}

      {videoOpen && vendor.introVideoUrl && (
        <CampaignLightbox label="Vendor introduction video" onClose={() => setVideoOpen(false)}>
          <div className="aspect-video w-full max-w-xl overflow-hidden rounded-xl bg-black">
            <CampaignVideoPlayer url={vendor.introVideoUrl} className="h-full w-full" />
          </div>
        </CampaignLightbox>
      )}
    </section>
  );
}
