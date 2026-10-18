'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Store, Trash2, Truck } from 'lucide-react';
import type { CartItem } from '@/types/cart';
import { useFreeShipping } from '@/hooks/use-free-shipping';
import { haptic } from '@/lib/mobile/haptics';
import { groupCartBySeller } from '@/lib/mobile/cart-groups';

const PLACEHOLDER = '/images/placeholder.svg';
const formatPrice = (value: number) => `₦${value.toLocaleString()}`;

type MobileCartListProps = {
  items: CartItem[];
  subtotal: number;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
};

/**
 * Mobile tier cart (docs/mobile-tier-plan.md, M3): free-delivery progress and
 * items grouped by seller, the way they ship. md and up use the existing list.
 */
export default function MobileCartList({ items, subtotal, onUpdateQuantity, onRemove }: MobileCartListProps) {
  const groups = groupCartBySeller(items);

  return (
    <div className="md:hidden">
      <FreeDeliveryProgress subtotal={subtotal} />
      {groups.map((group) => (
        <section
          key={group.seller}
          aria-label={`Sold by ${group.seller}`}
          className="mb-3 rounded-2xl bg-m-surface-lowest shadow-[0_0_0_1px_rgb(30_26_31/0.07)]"
        >
          <h2 className="flex min-h-12 items-center gap-2 px-4 pt-2 text-m-title-m text-m-on-surface">
            <Store className="h-5 w-5 text-m-on-surface-variant" aria-hidden />
            <span className="truncate">{group.seller}</span>
          </h2>
          {group.items.map((item, index) => (
            <div key={item.id}>
              {index > 0 && <div className="mx-4 h-px bg-m-outline-variant opacity-70" />}
              <MobileCartRow item={item} onUpdateQuantity={onUpdateQuantity} onRemove={onRemove} />
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function FreeDeliveryProgress({ subtotal }: { subtotal: number }) {
  const { threshold, loading } = useFreeShipping();
  // Only while JLO has a live offer with a minimum (0 = every order already qualifies).
  if (loading || threshold === null || threshold <= 0) return null;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = Math.min(100, Math.round((subtotal / threshold) * 100));

  return (
    <div className="mb-3 rounded-xl bg-m-tertiary-container px-4 py-3 text-m-on-tertiary-container">
      <p className="flex items-center gap-2.5 text-m-body-m">
        <Truck className="h-5 w-5 shrink-0" aria-hidden />
        {remaining > 0 ? (
          <span>
            Add <b className="tabular-nums">{formatPrice(remaining)}</b> more for free delivery
          </span>
        ) : (
          <span className="font-semibold">Your order qualifies for free delivery</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgb(90_36_0/0.14)]"
      >
        <div className="h-full rounded-full bg-m-tertiary transition-[width] duration-300 ease-m-standard" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function MobileCartRow({
  item,
  onUpdateQuantity,
  onRemove,
}: {
  item: CartItem;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}) {
  const [imgSrc, setImgSrc] = useState((item.image || '').trim() || PLACEHOLDER);
  const atStockLimit = item.stockQuantity !== null && item.quantity >= item.stockQuantity;
  const attributes = item.variation ? Object.entries(item.variation.attributes) : [];

  return (
    <div className="flex gap-3 px-4 py-3">
      <Link
        href={`/product/${item.slug}`}
        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white shadow-[inset_0_0_0_1px_var(--m-outline-variant)]"
      >
        <Image
          src={imgSrc}
          alt={item.name}
          fill
          sizes="80px"
          className="object-contain p-1.5"
          onError={() => setImgSrc(PLACEHOLDER)}
        />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/product/${item.slug}`} className="line-clamp-2 text-m-body-m text-m-on-surface">
          {item.name}
        </Link>
        {attributes.length > 0 && (
          <p className="mt-0.5 truncate text-m-body-s text-m-on-surface-variant">
            {attributes.map(([key, value]) => `${key}: ${value}`).join(' · ')}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="text-m-title-m tabular-nums text-m-on-surface">{formatPrice(item.price * item.quantity)}</span>
          <div className="inline-flex h-10 items-center rounded-full shadow-[inset_0_0_0_1px_var(--m-outline-variant)]">
            {item.quantity <= 1 ? (
              <button
                type="button"
                onClick={() => {
                  haptic('warning');
                  onRemove(item.id);
                }}
                aria-label={`Remove ${item.name}`}
                className="grid h-10 w-11 place-items-center rounded-full text-m-on-surface-variant active:bg-black/5"
              >
                <Trash2 className="h-[18px] w-[18px]" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  haptic('tap');
                  onUpdateQuantity(item.id, item.quantity - 1);
                }}
                aria-label="Decrease quantity"
                className="grid h-10 w-11 place-items-center rounded-full text-m-on-surface-variant active:bg-black/5"
              >
                <Minus className="h-[18px] w-[18px]" aria-hidden />
              </button>
            )}
            <span className="min-w-6 text-center text-m-title-s tabular-nums text-m-on-surface" aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => {
                haptic('tap');
                onUpdateQuantity(item.id, item.quantity + 1);
              }}
              disabled={atStockLimit}
              aria-label="Increase quantity"
              className="grid h-10 w-11 place-items-center rounded-full text-m-on-surface-variant active:bg-black/5 disabled:opacity-30"
            >
              <Plus className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </div>
        {item.stockQuantity !== null && item.stockQuantity < 5 && (
          <p className="mt-1.5 text-m-body-s font-medium text-m-on-tertiary-container">Only {item.stockQuantity} left in stock</p>
        )}
      </div>
    </div>
  );
}
