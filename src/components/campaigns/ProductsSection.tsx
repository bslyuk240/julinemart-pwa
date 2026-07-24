'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star } from 'lucide-react';
import type { Product } from '@/types/product';
import { useCartStore } from '@/store/cart-store';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';

function formatNaira(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '';
  return `₦${num.toLocaleString('en-NG')}`;
}

export default function ProductsSection({
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

  if (!products.length) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8" id="campaign-products">
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary-600">
        Featured products
      </p>
      <h2 className="mb-5 text-xl font-extrabold text-gray-900">Products picked for this campaign</h2>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {products.map((product) => {
          const inCart = isInCart(product.id);
          const onSale = product.on_sale && product.sale_price;
          return (
            <article
              key={product.id}
              className="w-[70vw] flex-none overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 sm:w-auto"
            >
              <div className="relative aspect-[3/2] bg-gradient-to-br from-primary-500 to-primary-800">
                {product.images?.[0]?.src && (
                  <Image
                    src={product.images[0].src}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 70vw, 33vw"
                  />
                )}
              </div>
              <div className="p-4">
                <h3 className="mb-1 line-clamp-2 text-sm font-extrabold text-gray-900">{product.name}</h3>
                <p className="mb-1.5 flex items-center gap-1 text-xs text-gray-500">
                  <Star className="h-3 w-3 fill-secondary-500 text-secondary-500" />
                  {product.average_rating || '0'} <span>({product.rating_count})</span>
                </p>
                <p className="mb-2 font-mono text-sm font-extrabold text-gray-900">
                  {formatNaira(onSale ? product.sale_price : product.price)}
                  {onSale && (
                    <span className="ml-2 text-xs font-normal text-gray-400 line-through">
                      {formatNaira(product.regular_price)}
                    </span>
                  )}
                </p>
                {product.type === 'variable' ? (
                  // Variable products need a size/color pick before they can be
                  // added to cart — reuse the real product page's proven
                  // variant picker instead of duplicating it here. The
                  // from_campaign params drive the "return to campaign"
                  // context bar on that page.
                  <Link
                    href={`/product/${product.slug}?from_campaign=${encodeURIComponent(campaignSlug)}&from_campaign_title=${encodeURIComponent(campaignTitle)}${offerText ? `&from_campaign_offer=${encodeURIComponent(offerText)}` : ''}`}
                    onClick={() => track('cta_click', { cta: 'choose_options', productId: product.id })}
                    className="flex min-h-[44px] w-full items-center justify-center rounded-full border-2 border-primary-600 text-xs font-extrabold text-primary-700 transition hover:bg-primary-600 hover:text-white"
                  >
                    Choose Options
                  </Link>
                ) : (
                  <button
                    disabled={product.stock_status === 'outofstock'}
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
    </section>
  );
}
