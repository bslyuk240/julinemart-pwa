'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignProductGrid from '@/components/campaigns/CampaignProductGrid';
import type { CampaignViewMoreLink } from '@/lib/campaigns/view-more';

const PAGE_SIZE = 12;
const MAX_CHIPS = 8;
const ALL = '__all__';

/** Categories across the products, most common first. Empty when they don't split the grid. */
function categoryChips(products: Product[]) {
  const counts = new Map<string, { name: string; slug: string; count: number }>();
  for (const p of products) {
    const seen = new Set<string>();
    for (const c of p.categories ?? []) {
      if (!c?.slug || seen.has(c.slug)) continue;
      seen.add(c.slug);
      const entry = counts.get(c.slug) ?? { name: c.name, slug: c.slug, count: 0 };
      entry.count += 1;
      counts.set(c.slug, entry);
    }
  }
  // A category every product is in filters nothing, so it isn't a useful chip.
  const list = [...counts.values()].filter((c) => c.count < products.length);
  if (list.length < 2) return [];
  return list.sort((a, b) => b.count - a.count).slice(0, MAX_CHIPS);
}

/**
 * Landing-page preview of the campaign's products: category chips over the
 * preview, 12 at a time with "Show more", and a "View all N products" link to
 * the paginated list when the campaign matches more than the preview holds.
 */
export default function ProductsSection({
  campaignId,
  campaignSlug,
  campaignTitle,
  offerText,
  codeDiscountLabel,
  products,
  viewMore,
  qrVariants = [],
}: {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  offerText?: string;
  /** e.g. "20% off" when an unrestricted percentage code applies to every product. */
  codeDiscountLabel?: string | null;
  products: Product[];
  viewMore?: CampaignViewMoreLink | null;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const chips = useMemo(() => categoryChips(products), [products]);
  const filtered = useMemo(
    () =>
      activeCategory === ALL
        ? products
        : products.filter((p) => (p.categories ?? []).some((c) => c?.slug === activeCategory)),
    [products, activeCategory]
  );

  if (!products.length) return null;

  const shown = filtered.slice(0, visibleCount);
  const remaining = filtered.length - shown.length;

  function selectCategory(slug: string) {
    setActiveCategory(slug);
    setVisibleCount(PAGE_SIZE);
  }

  const viewAllLink = viewMore && (
    <Link
      href={viewMore.href}
      onClick={() => track('cta_click', { cta: 'view_more_products' })}
      className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gray-900 underline-offset-4 hover:underline"
    >
      {viewMore.label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );

  return (
    <section className="scroll-mt-20" id="campaign-products" aria-labelledby="campaign-products-title">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 id="campaign-products-title" className="text-2xl font-extrabold tracking-tight text-gray-900">
            Shop the offer
          </h2>
          <p className="mt-0.5 text-sm text-gray-500" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
            {codeDiscountLabel ? ` · ${codeDiscountLabel} with your code` : ''}
          </p>
        </div>
        {viewAllLink && <div className="hidden sm:block">{viewAllLink}</div>}
      </div>

      {chips.length > 0 && (
        <div
          role="group"
          aria-label="Filter by category"
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {[{ name: 'All', slug: ALL, count: products.length }, ...chips].map((chip) => {
            const active = chip.slug === activeCategory;
            return (
              <button
                key={chip.slug}
                type="button"
                aria-pressed={active}
                onClick={() => selectCategory(chip.slug)}
                className={`flex min-h-[44px] flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition ${
                  active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {chip.name}
                <span className={active ? 'text-white/70' : 'text-gray-500'}>{chip.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <CampaignProductGrid
        campaignId={campaignId}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        offerText={offerText}
        codeDiscountLabel={codeDiscountLabel}
        products={shown}
        qrVariants={qrVariants}
      />

      {remaining > 0 && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-full border border-gray-300 bg-white px-6 text-sm font-semibold text-gray-900 transition hover:border-gray-400"
          >
            Show {Math.min(PAGE_SIZE, remaining)} more
            <span className="font-normal text-gray-500">· {remaining} left</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      {viewAllLink && <div className="mt-4 flex justify-center sm:hidden">{viewAllLink}</div>}
    </section>
  );
}
