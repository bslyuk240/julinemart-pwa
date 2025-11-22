import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toast } from 'sonner';
import { Product } from '@/types/product';
import type { CartItem as TypedCartItem } from '@/types/cart';
import { calculateTax, areTaxesEnabled } from '@/lib/woocommerce/tax-calculator';
import { getAllShippingMethods } from '@/lib/woocommerce/shipping';

export interface CartItem extends TypedCartItem {}

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
  ALREADY_IN_CART: 'Item is already in your cart',
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
        
        // Check if item already exists
        const existingItem = items.find(item => item.productId === product.id);
        
        if (existingItem) {
          // Update quantity instead
          get().updateQuantity(existingItem.id, existingItem.quantity + quantity);
          return;
        }
        
        // Check stock
        if (product.stock_status === 'outofstock') {
          toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
          return;
        }
        
        if (product.stock_quantity !== null && quantity > product.stock_quantity) {
          toast.error(ERROR_MESSAGES.LOW_STOCK);
          return;
        }
        
        // Add new item
        const newItem: CartItem = {
          id: Date.now(), // Unique ID for cart item
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.sale_price 
            ? parseFloat(product.sale_price)
            : parseFloat(product.price),
          regularPrice: product.regular_price ? parseFloat(product.regular_price) : 0,
          salePrice: product.sale_price ? parseFloat(product.sale_price) : undefined,
          quantity,
          image: product.images[0]?.src || '/placeholder.png',
          stockStatus: product.stock_status,
          stockQuantity: product.stock_quantity,
          sku: product.sku,
          vendorId: product.store?.id,
          vendorName: product.store?.name,
        };
        
        set(state => ({
          items: [...state.items, newItem],
        }));
        
        // Recalculate totals
        get().calculateTotals();
        toast.success(SUCCESS_MESSAGES.ADDED_TO_CART);
      },

      removeItem: (itemId: number) => {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId),
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
        
        const item = get().items.find(i => i.id === itemId);
        if (item?.stockQuantity && quantity > item.stockQuantity) {
          toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
          return;
        }
        
        set(state => ({
          items: state.items.map(item =>
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

      getItemQuantity: (productId: number): number => {
        const item = get().items.find(i => i.productId === productId);
        return item?.quantity || 0;
      },

      isInCart: (productId: number): boolean => {
        return get().items.some(item => item.productId === productId);
      },

      calculateTotals: async () => {
        const { items, couponCode } = get();
        
        // Set calculating flag
        set({ isCalculating: true });
        
        // Calculate subtotal
        const subtotal = items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
        
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);
        
        // Calculate discount from product sales
        const productDiscount = items.reduce((total, item) => {
          if (item.regularPrice && item.regularPrice > item.price) {
            return total + ((item.regularPrice - item.price) * item.quantity);
          }
          return total;
        }, 0);
        
        // Calculate coupon discount (if applicable)
        let couponDiscount = 0;
        if (couponCode) {
          // TODO: Fetch coupon from WooCommerce API and calculate discount
          // For now, this is placeholder - implement getCoupon() in woocommerce/coupons.ts
          // couponDiscount = await calculateCouponDiscount(subtotal, couponCode);
        }
        
        const totalDiscount = productDiscount + couponDiscount;
        
        // Subtotal after discount
        const discountedSubtotal = subtotal - totalDiscount;
        
        // Calculate tax dynamically from WooCommerce
        let tax = 0;
        try {
          const taxesEnabled = await areTaxesEnabled();
          
          if (taxesEnabled) {
            // Calculate tax on discounted subtotal
            tax = await calculateTax(discountedSubtotal, 'standard', 'NG', '');
          }
        } catch (error) {
          console.error('Error calculating tax:', error);
          tax = 0;
        }
        
        // Calculate shipping dynamically from WooCommerce shipping methods
        let shipping = 0;
        try {
          if (discountedSubtotal > 0) {
            const zonesWithMethods = await getAllShippingMethods();
            
            if (zonesWithMethods.length > 0) {
              // Get the first enabled shipping method
              const firstMethod = zonesWithMethods[0]?.methods[0];
              
              if (firstMethod) {
                // Check if it's free shipping
                if (firstMethod.method_id === 'free_shipping') {
                  shipping = 0;
                } else {
                  // Get cost from settings
                  const costSetting = firstMethod.settings?.cost?.value || '0';
                  shipping = parseFloat(costSetting);
                  
                  // Check for minimum order amount for free shipping
                  const minAmount = firstMethod.settings?.min_amount?.value;
                  if (minAmount && discountedSubtotal >= parseFloat(minAmount)) {
                    shipping = 0;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error calculating shipping:', error);
          // No default fallback - if shipping can't be calculated, it's 0
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

      applyCoupon: async (code: string) => {
        try {
          // TODO: Implement coupon validation with WooCommerce API
          // const coupon = await getCoupon(code);
          // if (coupon && coupon.code) {
          //   set({ couponCode: code });
          //   await get().calculateTotals();
          //   toast.success(SUCCESS_MESSAGES.COUPON_APPLIED);
          // }
          
          // Placeholder for now
          toast.error('Coupon functionality coming soon');
        } catch (error) {
          toast.error(ERROR_MESSAGES.INVALID_COUPON);
        }
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
        // Recalculate totals after rehydration
        state?.calculateTotals();
      },
    }
  )
);
