import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cart-store';

export function useCart() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);

  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);

  // Return 0 on server / before hydration to match SSR HTML
  const itemCount = hasMounted ? items.reduce((total, item) => total + item.quantity, 0) : 0;
  const subtotal = hasMounted ? items.reduce((total, item) => total + item.price * item.quantity, 0) : 0;

  const getItem = (productId: number) => {
    return items.find((item) => item.id === productId);
  };

  const isInCart = (productId: number) => {
    return items.some((item) => item.id === productId);
  };

  return {
    items: hasMounted ? items : [],
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
    subtotal,
    getItem,
    isInCart,
  };
}
