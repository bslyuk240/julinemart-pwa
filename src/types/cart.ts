import { Product } from './product';
import type { CartCustomisation } from './custom-order';

export interface CartItem {
  id: number;
  productId: number;
  supabaseProductId?: string;
  name: string;
  slug: string;
  price: number;
  regularPrice: number;
  salePrice?: number;
  quantity: number;
  image: string;
  stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  stockQuantity: number | null;
  sku: string;
  variation?: {
    id: number;
    supabaseId?: string;
    attributes: Record<string, string>;
    price: number;
    regularPrice: number;
    salePrice?: number;
    image?: string;
    sku?: string;
    stockQuantity: number | null;
    stockStatus: 'instock' | 'outofstock' | 'onbackorder';
  };
  vendorId?: number | string;
  vendorName?: string;
  hubId?: string | null;
  hubName?: string | null;  // ✅ ADD THIS LINE
  weight?: number;
  customisation?: CartCustomisation;
}
export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  tax: number;
  shipping: number;
  discount: number;
}

export interface CartState extends Cart {
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  isInCart: (productId: number) => boolean;
  calculateTotals: () => void;
}
