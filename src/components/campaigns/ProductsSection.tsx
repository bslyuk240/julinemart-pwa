'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignProductGrid from '@/components/campaigns/CampaignProductGrid';
import type { CampaignViewMoreLink } from '@/lib/campaigns/view-more';

export default function ProductsSection({
  campaignId,
  campaignSlug,
  campaignTitle,
  offerText,
  products,
  viewMore,
  qrVariants = [],
}: {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  offerText?: string;
  products: Product[];
  viewMore?: CampaignViewMoreLink | null;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);

  if (!products.length) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8" id="campaign-products">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary-600">
            Featured products
          </p>
          <h2 className="text-xl font-extrabold text-gray-900">Products picked for this campaign</h2>
        </div>
        {viewMore && (
          <Link
            href={viewMore.href}
            onClick={() => track('cta_click', { cta: 'view_more_products' })}
            className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-600 hover:text-primary-700"
          >
            {viewMore.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <CampaignProductGrid
        campaignId={campaignId}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        offerText={offerText}
        products={products}
        qrVariants={qrVariants}
      />

      {viewMore && (
        <div className="mt-5 flex justify-center sm:hidden">
          <Link
            href={viewMore.href}
            onClick={() => track('cta_click', { cta: 'view_more_products' })}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-primary-600 px-5 text-sm font-extrabold text-primary-700"
          >
            {viewMore.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
