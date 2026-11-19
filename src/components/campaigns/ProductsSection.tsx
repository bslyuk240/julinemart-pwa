'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCartStore } from '@/store/cart-store';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignProductQuickView from '@/components/campaigns/CampaignProductQuickView';
import type { CampaignViewMoreLink } from '@/lib/campaigns/view-more';

function formatNaira(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '';
  return `₦${num.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

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
  /** e.g. "20% off" when the campaign has a percentage coupon code. */
  codeDiscountLabel?: string | null;
  products: Product[];
  viewMore?: CampaignViewMoreLink | null;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  const isInCart = useCartStore((s) => s.isInCart);
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
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

  function openQuickView(product: Product, cta: string) {
    setQuickViewProduct(product);
    track('cta_click', { cta, productId: product.id });
  }

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
        {viewMore && (
          <Link
            href={viewMore.href}
            onClick={() => track('cta_click', { cta: 'view_more_products' })}
            className="hidden items-center gap-1.5 text-sm font-semibold text-gray-900 underline-offset-4 hover:underline sm:inline-flex"
          >
            {viewMore.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
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

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((product) => {
          const inCart = isInCart(product.id);
          const isVariable = product.type === 'variable';
          const outOfStock = product.stock_status === 'outofstock';
          const displayPrice =
            parseFloat(String(product.sale_price || product.price || product.min_price || '')) || 0;
          const regularPrice = parseFloat(String(product.regular_price || '')) || 0;
          const onSale =
            Boolean(product.on_sale && product.sale_price) &&
            regularPrice > displayPrice &&
            displayPrice > 0;
          const salePercent = onSale ? Math.round((1 - displayPrice / regularPrice) * 100) : 0;
          const hasRange =
            isVariable && product.max_price && product.min_price && product.max_price !== product.min_price;
          const priceLabel =
            displayPrice > 0
              ? hasRange
                ? `From ${formatNaira(displayPrice)}`
                : formatNaira(displayPrice)
              : isVariable
                ? 'See options'
                : '';
          const ratingCount = Number(product.rating_count) || 0;
          const previewCta = isVariable ? 'choose_options' : 'product_preview';

          return (
            <article
              key={product.id}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 transition hover:shadow-[0_12px_32px_-16px_rgba(16,24,40,0.25)]"
            >
              <button
                type="button"
                onClick={() => openQuickView(product, previewCta)}
                // Mouse/touch shortcut only; the name button below is the one
                // focusable preview control, so keyboard and screen-reader users
                // meet each product once.
                tabIndex={-1}
                aria-hidden="true"
                className="relative block aspect-square w-full overflow-hidden bg-gray-100 text-left"
              >
                {product.images?.[0]?.src && (
                  <Image
                    src={product.images[0].src}
                    alt={product.name}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )}
                {salePercent >= 1 && (
                  <span className="absolute left-2 top-2 rounded-full bg-secondary-500 px-2 py-0.5 text-[11px] font-bold text-gray-950">
                    -{salePercent}%
                  </span>
                )}
                {outOfStock && (
                  <span className="absolute inset-x-2 bottom-2 rounded-full bg-white/90 py-1 text-center text-[11px] font-semibold text-gray-700">
                    Out of stock
                  </span>
                )}
              </button>

              <div className="flex flex-1 flex-col p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => openQuickView(product, previewCta)}
                  className="mb-1.5 line-clamp-2 min-h-[2.5rem] text-left text-[13px] font-semibold leading-5 text-gray-900 hover:underline sm:text-sm"
                >
                  {product.name}
                </button>

                {ratingCount > 0 && (
                  <p className="mb-1 flex items-center gap-1 text-xs text-gray-500">
                    <Star className="h-3 w-3 fill-secondary-500 text-secondary-500" aria-hidden />
                    <span className="font-semibold text-gray-700">{product.average_rating}</span>
                    <span>({ratingCount})</span>
                  </p>
                )}

                <p className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
                  <span className="text-[15px] font-bold tabular-nums text-gray-900">{priceLabel}</span>
                  {onSale && (
                    <span className="text-xs tabular-nums text-gray-400 line-through">
                      {formatNaira(regularPrice)}
                    </span>
                  )}
                </p>
                {codeDiscountLabel && !outOfStock && (
                  <p className="mt-0.5 text-[11px] font-semibold text-secondary-800">
                    {codeDiscountLabel} with code
                  </p>
                )}

                {isVariable ? (
                  <button
                    type="button"
                    onClick={() => openQuickView(product, 'choose_options')}
                    disabled={outOfStock}
                    className="mt-3 flex min-h-[44px] w-full items-center justify-center rounded-full bg-gray-100 text-[13px] font-semibold text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
                  >
                    {outOfStock ? 'Out of stock' : 'Choose options'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={outOfStock || displayPrice <= 0}
                    onClick={() => {
                      addItem(product);
                      track('add_to_cart', { productId: product.id });
                    }}
                    className={`mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full text-[13px] font-semibold transition disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 ${
                      inCart
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-primary-600 text-white hover:bg-primary-700'
                    }`}
                  >
                    {outOfStock ? (
                      'Out of stock'
                    ) : inCart ? (
                      <>
                        <Check className="h-4 w-4" /> Added
                      </>
                    ) : (
                      'Add to cart'
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

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

      {viewMore && (
        <div className="mt-4 flex justify-center sm:hidden">
          <Link
            href={viewMore.href}
            onClick={() => track('cta_click', { cta: 'view_more_products' })}
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-gray-900"
          >
            {viewMore.label}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <CampaignProductQuickView
        product={quickViewProduct}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        offerText={offerText}
        open={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onAdded={(productId) => track('add_to_cart', { productId })}
      />
    </section>
  );
}
