'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCartStore } from '@/store/cart-store';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignProductQuickView from '@/components/campaigns/CampaignProductQuickView';

function formatNaira(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '';
  return `₦${num.toLocaleString('en-NG')}`;
}

/** The campaign's product cards with quick view and add-to-cart. Shared by the landing page preview and the "view all" page. */
export default function CampaignProductGrid({
  campaignId,
  campaignSlug,
  campaignTitle,
  offerText,
  products,
  qrVariants = [],
}: {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  offerText?: string;
  products: Product[];
  qrVariants?: CampaignQrVariantRef[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  const isInCart = useCartStore((s) => s.isInCart);
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  function openQuickView(product: Product, cta: string) {
    setQuickViewProduct(product);
    track('cta_click', { cta, productId: product.id });
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {products.map((product) => {
          const inCart = isInCart(product.id);
          const isVariable = product.type === 'variable';
          const displayPrice =
            parseFloat(String(product.sale_price || product.price || product.min_price || '')) || 0;
          const regularPrice = parseFloat(String(product.regular_price || '')) || 0;
          const onSale =
            Boolean(product.on_sale && product.sale_price) &&
            regularPrice > displayPrice &&
            displayPrice > 0;
          const priceLabel = displayPrice > 0
            ? isVariable && product.max_price && product.min_price && product.max_price !== product.min_price
              ? `From ${formatNaira(displayPrice)}`
              : formatNaira(displayPrice)
            : isVariable
              ? 'See options'
              : '';

          return (
            <article
              key={product.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
            >
              <button
                type="button"
                onClick={() => openQuickView(product, isVariable ? 'choose_options' : 'product_preview')}
                className="relative block aspect-[3/2] w-full bg-gradient-to-br from-primary-500 to-primary-800 text-left"
                aria-label={`Preview ${product.name}`}
              >
                {product.images?.[0]?.src && (
                  <Image
                    src={product.images[0].src}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                )}
              </button>
              <div className="p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => openQuickView(product, isVariable ? 'choose_options' : 'product_preview')}
                  className="mb-1 line-clamp-2 text-left text-sm font-extrabold text-gray-900 hover:text-primary-700"
                >
                  {product.name}
                </button>
                <p className="mb-1.5 flex items-center gap-1 text-xs text-gray-500">
                  <Star className="h-3 w-3 fill-secondary-500 text-secondary-500" />
                  {product.average_rating || '0'} <span>({product.rating_count})</span>
                </p>
                <p className="mb-2 font-mono text-sm font-extrabold text-gray-900">
                  {priceLabel}
                  {onSale && (
                    <span className="ml-2 text-xs font-normal text-gray-400 line-through">
                      {formatNaira(regularPrice)}
                    </span>
                  )}
                </p>
                {isVariable ? (
                  <button
                    type="button"
                    onClick={() => openQuickView(product, 'choose_options')}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-full border-2 border-primary-600 text-xs font-extrabold text-primary-700 transition hover:bg-primary-600 hover:text-white"
                  >
                    Choose Options
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={product.stock_status === 'outofstock' || displayPrice <= 0}
                    onClick={() => {
                      addItem(product);
                      track('add_to_cart', { productId: product.id });
                    }}
                    className="min-h-[44px] w-full rounded-full border-2 border-primary-600 text-xs font-extrabold text-primary-700 transition hover:bg-primary-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                  >
                    {product.stock_status === 'outofstock'
                      ? 'Out of stock'
                      : inCart
                        ? 'Added ✓'
                        : 'Add to cart'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <CampaignProductQuickView
        product={quickViewProduct}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        offerText={offerText}
        open={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onAdded={(productId) => track('add_to_cart', { productId })}
      />
    </>
  );
}
