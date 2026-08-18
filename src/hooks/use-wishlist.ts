import { useWishlistStore } from '@/store/wishlist-store';
import { useHydratedFavorites } from '@/lib/create-favorites-store';

export function useWishlist() {
  const items = useWishlistStore((state) => state.items);
  const addItem = useWishlistStore((state) => state.addItem);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const isSaved = useWishlistStore((state) => state.isSaved);
  const clear = useWishlistStore((state) => state.clear);

  const { hasMounted, items: visibleItems } = useHydratedFavorites(items);
  const itemCount = visibleItems.length;

  const isInWishlist = (productId: number) => hasMounted && isSaved(productId);

  const toggleWishlist = (productId: number, productData?: any) => {
    if (isInWishlist(productId)) {
      removeItem(productId);
      return false;
    } else {
      if (productData) {
        addItem(productData);
      }
      return true;
    }
  };

  return {
    items: visibleItems,
    addItem,
    removeItem,
    clearWishlist: clear,
    itemCount,
    isInWishlist,
    toggleWishlist,
  };
}
