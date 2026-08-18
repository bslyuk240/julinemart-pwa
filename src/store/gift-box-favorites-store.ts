import type { GiftBox } from '@/types/gifts';
import { createFavoritesStore } from '@/lib/create-favorites-store';

export interface GiftBoxFavoriteItem {
  giftBoxId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  addedAt: string;
}

export const useGiftBoxFavoritesStore = createFavoritesStore<GiftBoxFavoriteItem, GiftBox, string>({
  storageName: 'julinemart-gift-box-favorites',
  keyOf: (item) => item.giftBoxId,
  sourceKeyOf: (box) => box.id,
  toItem: (box) => ({
    giftBoxId: box.id,
    slug: box.slug,
    name: box.name,
    price: box.list_price,
    image: box.image_url,
    addedAt: new Date().toISOString(),
  }),
  addedMessage: 'Added to favorites',
  removedMessage: 'Removed from favorites',
});
