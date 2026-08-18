import { useGiftBoxFavoritesStore } from '@/store/gift-box-favorites-store';
import { useHydratedFavorites } from '@/lib/create-favorites-store';
import type { GiftBox } from '@/types/gifts';

export function useGiftBoxFavorites() {
  const items = useGiftBoxFavoritesStore((state) => state.items);
  const toggleItem = useGiftBoxFavoritesStore((state) => state.toggleItem);
  const isSaved = useGiftBoxFavoritesStore((state) => state.isSaved);
  const clear = useGiftBoxFavoritesStore((state) => state.clear);

  const { hasMounted, items: visibleItems } = useHydratedFavorites(items);
  const itemCount = visibleItems.length;

  const isFavorite = (giftBoxId: string) => hasMounted && isSaved(giftBoxId);
  const toggleFavorite = (box: GiftBox) => toggleItem(box);

  return {
    items: visibleItems,
    itemCount,
    isFavorite,
    toggleFavorite,
    clearFavorites: clear,
  };
}
