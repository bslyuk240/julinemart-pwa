import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { Product } from '@/types/product';
import type { CartItem as TypedCartItem } from '@/types/cart';
import { calculateTax, areTaxesEnabled } from '@/lib/woocommerce/tax-calculator';
import { getAllShippingMethods } from '@/lib/woocommerce/shipping';

export interface CartItem extends TypedCartItem {
  weight?: number;
}

interface CartState {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  total: number;
  tax: number;
  shipping: number;
  discount: number;
  couponCode: string | null;
  isCalculating: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: number) => number;
  isInCart: (productId: number) => boolean;
  calculateTotals: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => void;
}

const MAX_CART_QUANTITY = 99;

const SUCCESS_MESSAGES = {
  ADDED_TO_CART: 'Item added to cart',
  REMOVED_FROM_CART: 'Item removed from cart',
  COUPON_APPLIED: 'Coupon applied successfully',
  COUPON_REMOVED: 'Coupon removed',
};

const ERROR_MESSAGES = {
  OUT_OF_STOCK: 'Sorry, this item is out of stock',
  LOW_STOCK: 'Limited stock available',
  INVALID_COUPON: 'Invalid or expired coupon code',
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotal: 0,
      total: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
      couponCode: null,
      isCalculating: false,

      addItem: (product: Product, quantity = 1) => {
        const { items } = get();

        const existingItem = items.find((item) => item.productId === product.id);

        if (existingItem) {
          get().updateQuantity(existingItem.id, existingItem.quantity + quantity);
          return;
        }

        if (product.stock_status === 'outofstock') {
          toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
          return;
        }

        if (product.stock_quantity !== null && quantity > product.stock_quantity) {
          toast.error(ERROR_MESSAGES.LOW_STOCK);
          return;
        }

        // Get hub ID (your plugin stores as _julinemart_hub_id)
const hubIdMeta = product.meta_data?.find((m) => 
  m.key === '_julinemart_hub_id' ||
  m.key === 'hub_id' ||
  m.key === '_hub_id'
);
const hubId = hubIdMeta ? String(hubIdMeta.value) : null;

// Get hub name (optional, for display)
const hubNameMeta = product.meta_data?.find((m) => 
  m.key === '_julinemart_hub_name'
);
const hubName = hubNameMeta ? String(hubNameMeta.value) : null;

const numericWeight =
  product.weight !== undefined && product.weight !== null && product.weight !== ''
    ? parseFloat(String(product.weight))
    : undefined;

        const newItem: CartItem = {
  id: Date.now(),
  productId: product.id,
  name: product.name,
  slug: product.slug,
  price: product.sale_price
    ? parseFloat(product.sale_price)
    : parseFloat(product.price),
  regularPrice: product.regular_price
    ? parseFloat(product.regular_price)
    : 0,
  salePrice: product.sale_price ? parseFloat(product.sale_price) : undefined,
  quantity,
  image: product.images[0]?.src || '/placeholder.png',
  stockStatus: product.stock_status,
  stockQuantity: product.stock_quantity,
  sku: product.sku,
  vendorId: product.store?.id,
  vendorName: product.store?.name,
  hubId: hubId,          // ✅ Now extracts correctly
  hubName: hubName,      
  weight: numericWeight,
};

        set((state) => ({
          items: [...state.items, newItem],
        }));

        get().calculateTotals();
        toast.success(SUCCESS_MESSAGES.ADDED_TO_CART);
      },

      removeItem: (itemId: number) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== itemId),
        }));
        get().calculateTotals();
        toast.success(SUCCESS_MESSAGES.REMOVED_FROM_CART);
      },

      updateQuantity: (itemId: number, quantity: number) => {
        if (quantity < 1) {
          get().removeItem(itemId);
          return;
        }

        if (quantity > MAX_CART_QUANTITY) {
          toast.error(`Maximum quantity is ${MAX_CART_QUANTITY}`);
          return;
        }

        const item = get().items.find((i) => i.id === itemId);
        if (item?.stockQuantity && quantity > item.stockQuantity) {
          toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, quantity } : item
          ),
        }));
        get().calculateTotals();
      },

      clearCart: () => {
        set({
          items: [],
          itemCount: 0,
          subtotal: 0,
          total: 0,
          tax: 0,
          shipping: 0,
          discount: 0,
          couponCode: null,
        });
      },

      getItemQuantity: (productId: number) => {
        const item = get().items.find((i) => i.productId === productId);
        return item?.quantity || 0;
      },

      isInCart: (productId: number) => {
        return get().items.some((item) => item.productId === productId);
      },

      calculateTotals: async () => {
        const { items, couponCode } = get();

        set({ isCalculating: true });

        const subtotal = items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );

        const itemCount = items.reduce(
          (count, item) => count + item.quantity,
          0
        );

        const productDiscount = items.reduce((total, item) => {
          if (item.regularPrice && item.regularPrice > item.price) {
            return (
              total +
              (item.regularPrice - item.price) * item.quantity
            );
          }
          return total;
        }, 0);

        let couponDiscount = 0;

        const totalDiscount = productDiscount + couponDiscount;
        const discountedSubtotal = subtotal - totalDiscount;

        let tax = 0;
        try {
          const taxesEnabled = await areTaxesEnabled();

          if (taxesEnabled) {
            tax = await calculateTax(discountedSubtotal, 'standard', 'NG', '');
          }
        } catch {
          tax = 0;
        }

        let shipping = 0;
        try {
          if (discountedSubtotal > 0) {
            const zonesWithMethods = await getAllShippingMethods();

            if (zonesWithMethods.length > 0) {
              const firstMethod = zonesWithMethods[0]?.methods[0];

              if (firstMethod) {
                if (firstMethod.method_id === 'free_shipping') {
                  shipping = 0;
                } else {
                  const costSetting =
                    firstMethod.settings?.cost?.value || '0';
                  shipping = parseFloat(costSetting);

                  const minAmount = firstMethod.settings?.min_amount?.value;
                  if (
                    minAmount &&
                    discountedSubtotal >= parseFloat(minAmount)
                  ) {
                    shipping = 0;
                  }
                }
              }
            }
          }
        } catch {
          shipping = 0;
        }

        const total = discountedSubtotal + tax + shipping;

        set({
          subtotal,
          itemCount,
          tax,
          shipping,
          discount: totalDiscount,
          total,
          isCalculating: false,
        });
      },

      applyCoupon: async () => {
        toast.error('Coupon functionality coming soon');
      },

      removeCoupon: () => {
        set({ couponCode: null, discount: 0 });
        get().calculateTotals();
        toast.success(SUCCESS_MESSAGES.COUPON_REMOVED);
      },
    }),
    {
      name: 'julinemart-cart',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.calculateTotals();
      },
    }
  )
);
