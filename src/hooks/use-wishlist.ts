import { useWishlistStore } from '@/store/wishlist-store';

export function useWishlist() {
  const items = useWishlistStore((state) => state.items);
  const addItem = useWishlistStore((state) => state.addItem);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  const itemCount = items.length;

  const isInWishlist = (productId: number) => {
    // Fixed: Check productId property, not id
    return items.some((item) => item.productId === productId);
  };

  const toggleWishlist = (productId: number, productData?: any) => {
    if (isInWishlist(productId)) {
      removeItem(productId);
      return false; // Removed from wishlist
    } else {
      if (productData) {
        addItem(productData);
      }
      return true; // Added to wishlist
    }
  };

  return {
    items,
    addItem,
    removeItem,
    clearWishlist,
    itemCount,
    isInWishlist,
    toggleWishlist,
  };
}