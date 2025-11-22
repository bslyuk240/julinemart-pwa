import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, CartState } from '@/types/cart';
import { Product } from '@/types/product';
import { toast } from 'sonner';
import { SUCCESS_MESSAGES, ERROR_MESSAGES, MAX_CART_QUANTITY } from '@/lib/constants';

interface CartStore extends CartState {}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      itemCount: 0,
      subtotal: 0,
      total: 0,
      tax: 0,
      shipping: 0,
      discount: 0,

      addItem: (product: Product, quantity: number = 1) => {
        const { items } = get();
        
        // Check if product is already in cart
        const existingItem = items.find(item => item.productId === product.id);
        
        if (existingItem) {
          // Update quantity if already exists
          const newQuantity = existingItem.quantity + quantity;
          
          if (newQuantity > MAX_CART_QUANTITY) {
            toast.error(`Maximum quantity is ${MAX_CART_QUANTITY}`);
            return;
          }
          
          if (product.stock_quantity && newQuantity > product.stock_quantity) {
            toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
            return;
          }
          
          set(state => ({
            items: state.items.map(item =>
              item.productId === product.id
                ? { ...item, quantity: newQuantity }
                : item
            ),
          }));
        } else {
          // Add new item
          if (product.stock_status !== 'instock') {
            toast.error(ERROR_MESSAGES.OUT_OF_STOCK);
            return;
          }
          
          const newItem: CartItem = {
            id: Date.now(),
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: parseFloat(product.price) || 0,
            regularPrice: parseFloat(product.regular_price) || 0,
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
        }
        
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
        });
      },

      getItemQuantity: (productId: number): number => {
        const item = get().items.find(i => i.productId === productId);
        return item?.quantity || 0;
      },

      isInCart: (productId: number): boolean => {
        return get().items.some(item => item.productId === productId);
      },

      calculateTotals: () => {
        const { items } = get();
        const subtotal = items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
        const itemCount = items.reduce((count, item) => count + item.quantity, 0);
        
        // Calculate tax (e.g., 7.5% VAT in Nigeria)
        const tax = subtotal * 0.075;
        
        // Calculate shipping (simplified - should be calculated based on address)
        const shipping = subtotal > 0 ? 1500 : 0;
        
        const total = subtotal + tax + shipping;
        
        set({ subtotal, itemCount, tax, shipping, total });
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