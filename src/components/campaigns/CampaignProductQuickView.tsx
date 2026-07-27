'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Product, ProductVariation } from '@/types/product';
import { getProductVariations } from '@/lib/woocommerce/products';
import { useCartStore } from '@/store/cart-store';
import {
  cleanOptionLabel,
  hasUsableInlineVariations,
  inferVariationAttributes,
  matchesVariationSelection,
  normalizeVariationKey,
  parseMoney,
} from '@/lib/campaigns/variation-utils';
import { buildCampaignProductHref } from '@/lib/campaigns/view-more';

function formatNaira(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '';
  return `₦${value.toLocaleString('en-NG')}`;
}

function formatPriceLabel(product: Product, selectedPrice: number, variations: ProductVariation[]) {
  if (selectedPrice > 0) return formatNaira(selectedPrice);

  const prices = variations
    .map((v) => parseMoney(v.sale_price, v.price, v.regular_price))
    .filter((n) => n > 0);
  if (prices.length === 1) return formatNaira(prices[0]);
  if (prices.length > 1) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? formatNaira(min) : `${formatNaira(min)} – ${formatNaira(max)}`;
  }

  const fallback = parseMoney(product.sale_price, product.price, product.min_price);
  return fallback > 0 ? formatNaira(fallback) : 'Select options';
}

export default function CampaignProductQuickView({
  product,
  campaignSlug,
  campaignTitle,
  offerText,
  open,
  onClose,
  onAdded,
}: {
  product: Product | null;
  campaignSlug: string;
  campaignTitle: string;
  offerText?: string;
  open: boolean;
  onClose: () => void;
  onAdded?: (productId: number) => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const [selectedVariation, setSelectedVariation] = useState<ProductVariation | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!open || !product) return;

    setAdded(false);
    setSelectedVariation(null);
    setSelectedAttributes({});
    setVariations([]);
    setLoadError(false);

    if (product.type !== 'variable') return;

    let cancelled = false;
    (async () => {
      try {
        setLoadingVariations(true);
        const inline = hasUsableInlineVariations(product._variations)
          ? product._variations
          : null;
        const data = inline ?? (await getProductVariations(product.id));
        if (cancelled) return;

        if (!data.length) {
          setVariations([]);
          setLoadError(true);
          return;
        }

        setVariations(data);

        // Prefill defaults, otherwise auto-select when each attribute has one option.
        const inferred = inferVariationAttributes(data);
        const defaults: Record<string, string> = {};

        if (product.default_attributes?.length) {
          product.default_attributes.forEach((attr: { name?: string; option?: string }) => {
            const k = normalizeVariationKey(String(attr.name ?? ''));
            const v = (attr.option ?? '').trim();
            if (k && v) defaults[k] = v;
          });
        }

        inferred.forEach((attr) => {
          const key = normalizeVariationKey(attr.name ?? '');
          if (!key || defaults[key]) return;
          if (attr.options.length === 1) defaults[key] = attr.options[0].trim();
        });

        // Single variation → select all of its attributes.
        if (data.length === 1) {
          data[0].attributes.forEach((attr) => {
            const key = normalizeVariationKey(attr.name ?? '');
            const option = (attr.option ?? '').trim();
            if (key && option) defaults[key] = option;
          });
        }

        setSelectedAttributes(defaults);
      } catch {
        if (!cancelled) {
          setVariations([]);
          setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoadingVariations(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, product]);

  const selectedKeyedAttrs = useMemo(() => {
    return Object.entries(selectedAttributes).reduce<Record<string, string>>((acc, [key, value]) => {
      const normalizedKey = normalizeVariationKey(key);
      if (normalizedKey && value) acc[normalizedKey] = value;
      return acc;
    }, {});
  }, [selectedAttributes]);

  useEffect(() => {
    if (!variations.length) {
      setSelectedVariation(null);
      return;
    }
    const match = variations.find((variation) =>
      matchesVariationSelection(variation, selectedKeyedAttrs, {}, true)
    );
    setSelectedVariation(match || null);
  }, [selectedKeyedAttrs, variations]);

  const variationAttributes = useMemo(() => {
    const inferred = inferVariationAttributes(variations);
    if (inferred.length > 0) return inferred;
    return product?.attributes?.filter((attr) => attr.variation) || [];
  }, [product, variations]);

  const selectedPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedVariation) {
      const sale = selectedVariation.sale_price
        ? parseFloat(String(selectedVariation.sale_price))
        : NaN;
      if (Number.isFinite(sale) && sale > 0) return sale;
      const fromVariation = parseMoney(selectedVariation.price, selectedVariation.regular_price);
      if (fromVariation > 0) return fromVariation;
    }
    return 0;
  }, [product, selectedVariation]);

  const imageSrc =
    selectedVariation?.image?.src || product?.images?.[0]?.src || '';

  const detailsHref = product
    ? buildCampaignProductHref(product.slug, campaignSlug, campaignTitle, offerText)
    : '#';

  const isVariable = product?.type === 'variable';
  const needsVariation = Boolean(isVariable);
  const canAdd =
    Boolean(product) &&
    !loadingVariations &&
    (!needsVariation || (Boolean(selectedVariation) && selectedPrice > 0)) &&
    selectedVariation?.stock_status !== 'outofstock' &&
    !(needsVariation && loadError);

  const outOfStock =
    selectedVariation?.stock_status === 'outofstock' ||
    (!selectedVariation && !isVariable && product?.stock_status === 'outofstock');

  function handleAdd() {
    if (!product) return;
    if (needsVariation && (!selectedVariation || selectedPrice <= 0)) {
      toast.error('Please choose your options first');
      return;
    }

    const variationPayload = selectedVariation
      ? {
          id: selectedVariation.id,
          supabaseId: selectedVariation.supabaseId,
          attributes: selectedVariation.attributes.reduce<Record<string, string>>((acc, attr) => {
            acc[attr.name] = attr.option;
            return acc;
          }, {}),
          price: selectedPrice,
          regularPrice: parseMoney(selectedVariation.regular_price, selectedVariation.price) || selectedPrice,
          salePrice: selectedVariation.sale_price
            ? parseFloat(selectedVariation.sale_price)
            : undefined,
          image: selectedVariation.image?.src,
          sku: selectedVariation.sku,
          stockQuantity: selectedVariation.stock_quantity ?? null,
          stockStatus: selectedVariation.stock_status,
        }
      : undefined;

    addItem(product, 1, variationPayload);
    setAdded(true);
    onAdded?.(product.id);
  }

  if (!open || !product) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-wide text-primary-600">
            Choose options
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative aspect-[4/3] bg-gradient-to-br from-primary-500 to-primary-800">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 512px"
            />
          )}
        </div>

        <div className="space-y-4 p-5">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">{product.name}</h3>
            <p className="mt-1 font-mono text-base font-extrabold text-gray-900">
              {formatPriceLabel(product, selectedPrice, variations)}
            </p>
            {product.short_description && (
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                {product.short_description.replace(/<[^>]*>/g, '').trim()}
              </p>
            )}
          </div>

          {isVariable && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              {loadingVariations && (
                <p className="text-sm text-gray-500">Loading options…</p>
              )}
              {loadError && !loadingVariations && (
                <p className="text-sm text-red-600">
                  Options couldn&apos;t be loaded. Open full details to choose a variation.
                </p>
              )}
              {variationAttributes.map((attr) => {
                const key = normalizeVariationKey(attr.name ?? '');
                const selected = key ? selectedAttributes[key] : undefined;

                const isOptionAvailable = (option: string) => {
                  if (!variations.length) return true;
                  return variations.some((variation) =>
                    matchesVariationSelection(
                      variation,
                      selectedKeyedAttrs,
                      key ? { [key]: option } : {},
                      false
                    )
                  );
                };

                return (
                  <div key={attr.id || attr.name || key} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">{attr.name}</p>
                      {selected && (
                        <span className="text-xs text-gray-500">
                          {cleanOptionLabel(selected)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {attr.options.map((option, index) => {
                        const optionTrimmed = (option ?? '').trim();
                        const isSelected = selected === optionTrimmed;
                        const disabled = !isOptionAvailable(optionTrimmed);
                        return (
                          <button
                            key={`${key}-${optionTrimmed || index}`}
                            type="button"
                            disabled={disabled}
                            onClick={() =>
                              key &&
                              setSelectedAttributes((prev) => ({
                                ...prev,
                                [key]: optionTrimmed,
                              }))
                            }
                            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? 'border-primary-600 bg-primary-50 font-semibold text-primary-700'
                                : 'border-gray-300 text-gray-700 hover:border-primary-500'
                            } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                          >
                            {cleanOptionLabel(optionTrimmed)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {variationAttributes.length > 0 &&
                variationAttributes.every((attr) =>
                  selectedAttributes[normalizeVariationKey(attr.name ?? '')]
                ) &&
                !selectedVariation &&
                !loadingVariations && (
                  <p className="text-sm text-red-600">
                    This combination is not available. Please choose a different option.
                  </p>
                )}
            </div>
          )}

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              disabled={!canAdd || outOfStock}
              onClick={handleAdd}
              className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-secondary-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-secondary-500/25 transition hover:bg-secondary-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
            >
              {outOfStock
                ? 'Out of stock'
                : loadingVariations
                  ? 'Loading options…'
                  : needsVariation && selectedPrice <= 0
                    ? 'Select options to add'
                    : added
                      ? 'Added ✓ — pick another'
                      : selectedPrice > 0
                        ? `Add to cart · ${formatNaira(selectedPrice)}`
                        : 'Add to cart'}
            </button>

            <Link
              href={detailsHref}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border-2 border-primary-600 px-4 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50"
            >
              View full details
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
