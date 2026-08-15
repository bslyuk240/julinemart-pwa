import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import type { GiftBox } from '@/types/gifts';

interface GiftBoxFavoriteItem {
  giftBoxId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  addedAt: string;
}

interface GiftBoxFavoritesState {
  items: GiftBoxFavoriteItem[];
  addItem: (box: GiftBox) => void;
  removeItem: (giftBoxId: string) => void;
  isFavorite: (giftBoxId: string) => boolean;
  toggleItem: (box: GiftBox) => boolean;
  clearFavorites: () => void;
}

export const useGiftBoxFavoritesStore = create<GiftBoxFavoritesState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (box: GiftBox) => {
        const { items } = get();
        if (items.some((item) => item.giftBoxId === box.id)) return;

        set((state) => ({
          items: [
            ...state.items,
            {
              giftBoxId: box.id,
              slug: box.slug,
              name: box.name,
              price: box.list_price,
              image: box.image_url,
              addedAt: new Date().toISOString(),
            },
          ],
        }));
        toast.success('Added to favorites');
      },

      removeItem: (giftBoxId: string) => {
        set((state) => ({
          items: state.items.filter((item) => item.giftBoxId !== giftBoxId),
        }));
        toast.success('Removed from favorites');
      },

      isFavorite: (giftBoxId: string): boolean => {
        return get().items.some((item) => item.giftBoxId === giftBoxId);
      },

      toggleItem: (box: GiftBox): boolean => {
        const { isFavorite, addItem, removeItem } = get();
        if (isFavorite(box.id)) {
          removeItem(box.id);
          return false;
        }
        addItem(box);
        return true;
      },

      clearFavorites: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'julinemart-gift-box-favorites',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
