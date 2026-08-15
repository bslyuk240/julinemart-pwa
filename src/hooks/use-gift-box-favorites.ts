import { useEffect, useState } from 'react';
import { useGiftBoxFavoritesStore } from '@/store/gift-box-favorites-store';
import type { GiftBox } from '@/types/gifts';

export function useGiftBoxFavorites() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const items = useGiftBoxFavoritesStore((state) => state.items);
  const toggleItem = useGiftBoxFavoritesStore((state) => state.toggleItem);
  const clearFavorites = useGiftBoxFavoritesStore((state) => state.clearFavorites);

  const itemCount = hasMounted ? items.length : 0;

  const isFavorite = (giftBoxId: string) => {
    return hasMounted && items.some((item) => item.giftBoxId === giftBoxId);
  };

  const toggleFavorite = (box: GiftBox) => toggleItem(box);

  return {
    items: hasMounted ? items : [],
    itemCount,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  };
}
