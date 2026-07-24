'use client';

import Image from 'next/image';
import { Play, ArrowRight } from 'lucide-react';
import type { CampaignVendorOverride } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';

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
  if (!vendor) return null;

  const storeHref = resolveVendorStoreHref(vendor.storeLinkUrl);

  return (
    <section className="grid gap-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
      <div>
        <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-primary-600">Meet the vendor</p>
        <h2 className="mb-3 text-2xl font-extrabold text-gray-900">{vendor.name}</h2>
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
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-600"
          >
            Visit {vendor.name}&rsquo;s full store <ArrowRight className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {vendor.introVideoUrl ? (
        <button
          onClick={() => track('video_view')}
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
    </section>
  );
}
