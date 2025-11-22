'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import CartItem from '@/components/cart/cart-item';
import CartSummary from '@/components/cart/cart-summary';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, itemCount } = useCart();

  const handleCheckout = () => {
    router.push('/checkout');
  };

  // Calculate totals
  const shipping = subtotal > 10000 ? 0 : 1500;
  const total = subtotal + shipping;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 text-sm md:text-base"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Continue</span>
          </Link>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 leading-tight">
            Cart ({itemCount})
          </h1>
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-600 mb-6">
              Add some products to get started
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Cart with Items */
          <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-3 md:p-5">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                  Items ({itemCount})
                </h2>
                <div className="divide-y divide-gray-200">
                  {items.map((item) => (
                    <CartItem
                      key={item.id}
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeItem}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <CartSummary
                subtotal={subtotal}
                shipping={shipping}
                total={total}
                itemCount={itemCount}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
