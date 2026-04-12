import { useEffect, useState } from 'react';
import { useWishlistStore } from '@/store/wishlist-store';

export function useWishlist() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const items = useWishlistStore((state) => state.items);
  const addItem = useWishlistStore((state) => state.addItem);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);

  // Return 0 on server / before hydration to match SSR HTML
  const itemCount = hasMounted ? items.length : 0;

  const isInWishlist = (productId: number) => {
    return hasMounted && items.some((item) => item.productId === productId);
  };

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
    items: hasMounted ? items : [],
    addItem,
    removeItem,
    clearWishlist,
    itemCount,
    isInWishlist,
    toggleWishlist,
  };
}
