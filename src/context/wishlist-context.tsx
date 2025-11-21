'use client';

import { createContext, useContext } from 'react';
import { useWishlist } from '@/hooks/use-wishlist';

const WishlistContext = createContext<ReturnType<typeof useWishlist> | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const wishlist = useWishlist();
  return <WishlistContext.Provider value={wishlist}>{children}</WishlistContext.Provider>;
}

export function useWishlistContext() {
  const context = useContext(WishlistContext);
  return context ?? useWishlist();
}
