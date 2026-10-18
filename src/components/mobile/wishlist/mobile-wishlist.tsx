'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Gift, Plus, X } from 'lucide-react';
import { haptic } from '@/lib/mobile/haptics';

type WishlistItem = {
  productId: number;
  name: string;
  slug: string;
  price: string;
  image: string;
};

type SavedGiftBox = {
  giftBoxId: string;
  name: string;
  slug: string;
  price: number;
  image?: string | null;
};

type MobileWishlistProps<T extends WishlistItem> = {
  items: T[];
  giftBoxes: SavedGiftBox[];
  onAddToCart: (item: T) => void;
  onAddAll: () => void;
  onRemove: (productId: number) => void;
  onRemoveGiftBox: (giftBoxId: string) => void;
};

const naira = (value: string | number) => `₦${(parseFloat(String(value)) || 0).toLocaleString()}`;

/**
 * Mobile tier wishlist (wave 2): compact rows (photo, name, price, add, remove)
 * grouped into products and saved gift boxes. md and up keep the card grid.
 */
export default function MobileWishlist<T extends WishlistItem>({
  items,
  giftBoxes,
  onAddToCart,
  onAddAll,
  onRemove,
  onRemoveGiftBox,
}: MobileWishlistProps<T>) {
  return (
    <div className="md:hidden">
      {items.length > 0 && (
        <section aria-labelledby="wishlist-products" className="mb-3 rounded-2xl bg-m-surface-lowest shadow-[0_0_0_1px_rgb(30_26_31/0.07)]">
          <div className="flex min-h-12 items-center justify-between pl-4 pr-2 pt-2">
            <h2 id="wishlist-products" className="text-m-title-m text-m-on-surface">
              Products
            </h2>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  haptic('success');
                  onAddAll();
                }}
                className="h-10 rounded-full px-3 text-m-label-l text-m-primary active:bg-m-primary-container"
              >
                Add all to cart
              </button>
            )}
          </div>
          {items.map((item, index) => (
            <div key={item.productId}>
              {index > 0 && <div className="mx-4 h-px bg-m-outline-variant opacity-70" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <Link
                  href={`/product/${item.slug}`}
                  className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white shadow-[inset_0_0_0_1px_var(--m-outline-variant)]"
                >
                  <Image
                    src={item.image || '/images/placeholder.svg'}
                    alt={item.name}
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </Link>
                <Link href={`/product/${item.slug}`} className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-m-body-m text-m-on-surface">{item.name}</span>
                  <span className="text-m-title-s tabular-nums text-m-on-surface">{naira(item.price)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    haptic('success');
                    onAddToCart(item);
                  }}
                  aria-label={`Add ${item.name} to cart`}
                  className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-m-primary-container text-m-on-primary-container before:absolute before:-inset-1 before:content-['']"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    onRemove(item.productId);
                  }}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="grid h-12 w-10 shrink-0 place-items-center text-m-on-surface-variant"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {giftBoxes.length > 0 && (
        <section aria-labelledby="wishlist-gifts" className="mb-3 rounded-2xl bg-m-surface-lowest shadow-[0_0_0_1px_rgb(30_26_31/0.07)]">
          <h2 id="wishlist-gifts" className="flex min-h-12 items-center px-4 pt-2 text-m-title-m text-m-on-surface">
            Saved gift boxes
          </h2>
          {giftBoxes.map((box, index) => (
            <div key={box.giftBoxId}>
              {index > 0 && <div className="mx-4 h-px bg-m-outline-variant opacity-70" />}
              <div className="flex items-center gap-3 px-4 py-3">
                <Link
                  href={`/gifts/boxes/${box.slug}`}
                  className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-m-surface-container"
                >
                  {box.image ? (
                    <Image src={box.image} alt={box.name} fill sizes="64px" className="object-cover" />
                  ) : (
                    <Gift className="h-7 w-7 text-m-on-surface-variant" aria-hidden />
                  )}
                </Link>
                <Link href={`/gifts/boxes/${box.slug}`} className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-m-body-m text-m-on-surface">{box.name}</span>
                  <span className="text-m-title-s tabular-nums text-m-on-surface">{naira(box.price)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    haptic('tap');
                    onRemoveGiftBox(box.giftBoxId);
                  }}
                  aria-label={`Remove ${box.name} from saved gift boxes`}
                  className="grid h-12 w-10 shrink-0 place-items-center text-m-on-surface-variant"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
