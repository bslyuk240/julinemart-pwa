'use client';

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';

export interface FavoritesConfig<TItem, TSource, TKey> {
  storageName: string;
  keyOf: (item: TItem) => TKey;
  sourceKeyOf: (source: TSource) => TKey;
  toItem: (source: TSource) => TItem;
  addedMessage: string;
  removedMessage: string;
  /** Omit to silently no-op on a duplicate add, matching item lists that don't toast on it. */
  duplicateMessage?: string;
}

export interface FavoritesState<TItem, TSource, TKey> {
  items: TItem[];
  addItem: (source: TSource) => void;
  removeItem: (key: TKey) => void;
  isSaved: (key: TKey) => boolean;
  toggleItem: (source: TSource) => boolean;
  clear: () => void;
}

/** A persisted, toast-on-change "saved items" zustand store — the shared shape behind wishlist and gift-box favorites. */
export function createFavoritesStore<TItem, TSource, TKey>(
  config: FavoritesConfig<TItem, TSource, TKey>
) {
  return create<FavoritesState<TItem, TSource, TKey>>()(
    persist(
      (set, get) => ({
        items: [],

        addItem: (source) => {
          const key = config.sourceKeyOf(source);
          if (get().items.some((item) => config.keyOf(item) === key)) {
            if (config.duplicateMessage) toast.info(config.duplicateMessage);
            return;
          }
          set((state) => ({ items: [...state.items, config.toItem(source)] }));
          toast.success(config.addedMessage);
        },

        removeItem: (key) => {
          set((state) => ({ items: state.items.filter((item) => config.keyOf(item) !== key) }));
          toast.success(config.removedMessage);
        },

        isSaved: (key) => get().items.some((item) => config.keyOf(item) === key),

        toggleItem: (source) => {
          const key = config.sourceKeyOf(source);
          const { isSaved, addItem, removeItem } = get();
          if (isSaved(key)) {
            removeItem(key);
            return false;
          }
          addItem(source);
          return true;
        },

        clear: () => set({ items: [] }),
      }),
      {
        name: config.storageName,
        storage: createJSONStorage(() => localStorage),
      }
    )
  );
}

/** SSR-hydration guard shared by every "saved items" hook: [] / count 0 until the client has mounted. */
export function useHydratedFavorites<TItem>(items: TItem[]) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  return { hasMounted, items: hasMounted ? items : [] };
}
