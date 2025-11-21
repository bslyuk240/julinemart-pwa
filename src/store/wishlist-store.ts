import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Product } from '@/types/product';
import { toast } from 'sonner';
import { SUCCESS_MESSAGES } from '@/lib/constants';

interface WishlistItem {
  id: number;
  productId: number;
  name: string;
  slug: string;
  price: string;
  image: string;
  addedAt: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
  toggleItem: (product: Product) => void;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product: Product) => {
        const { items } = get();
        
        if (items.some(item => item.productId === product.id)) {
          toast.info('Already in wishlist');
          return;
        }
        
        const newItem: WishlistItem = {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: product.images[0]?.src || '/placeholder.png',
          addedAt: new Date().toISOString(),
        };
        
        set(state => ({
          items: [...state.items, newItem],
        }));
        
        toast.success(SUCCESS_MESSAGES.ADDED_TO_WISHLIST);
      },

      removeItem: (productId: number) => {
        set(state => ({
          items: state.items.filter(item => item.productId !== productId),
        }));
        toast.success(SUCCESS_MESSAGES.REMOVED_FROM_WISHLIST);
      },

      isInWishlist: (productId: number): boolean => {
        return get().items.some(item => item.productId === productId);
      },

      toggleItem: (product: Product) => {
        const { isInWishlist, addItem, removeItem } = get();
        
        if (isInWishlist(product.id)) {
          removeItem(product.id);
        } else {
          addItem(product);
        }
      },

      clearWishlist: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'julinemart-wishlist',
      storage: createJSONStorage(() => localStorage),
    }
  )
);