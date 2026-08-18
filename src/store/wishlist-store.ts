import { Product } from '@/types/product';
import { SUCCESS_MESSAGES } from '@/lib/constants';
import { createFavoritesStore } from '@/lib/create-favorites-store';

export interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  slug: string;
  price: string;
  image: string;
  addedAt: string;
}

export const useWishlistStore = createFavoritesStore<WishlistItem, Product, number>({
  storageName: 'julinemart-wishlist',
  keyOf: (item) => item.productId,
  sourceKeyOf: (product) => product.id,
  toItem: (product) => ({
    id: Date.now(),
    productId: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    // Accept both shapes: full product (images[]) from product cards, and
    // the flat { image } object passed from the product detail page.
    image:
      product.images?.[0]?.src ||
      (product as any).image ||
      '/images/placeholder.svg',
    addedAt: new Date().toISOString(),
  }),
  addedMessage: SUCCESS_MESSAGES.ADDED_TO_WISHLIST,
  removedMessage: SUCCESS_MESSAGES.REMOVED_FROM_WISHLIST,
  duplicateMessage: 'Already in wishlist',
});
