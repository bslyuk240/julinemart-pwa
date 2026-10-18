'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '@/hooks/use-cart';
import CartItem from '@/components/cart/cart-item';
import CartSummary from '@/components/cart/cart-summary';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import MobileCartList from '@/components/mobile/cart/mobile-cart-list';

export default function CartPage() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, subtotal, itemCount } = useCart();
  // Mobile tier (docs/mobile-tier-plan.md, M3): mobile-only pieces are gated on
  // `tier` plus md:hidden / max-md: classes; desktop is unchanged.
  const tier = useMobileTier() !== null;
  const shipping = null;
  const tax = 0;
  const discount = 0;
  const total = subtotal + (shipping || 0) + tax - discount;

  const handleCheckout = () => {
    router.push('/checkout');
  };

  return (
    <main
      className={clsx(
        'min-h-screen min-w-0 overflow-x-hidden bg-gray-50 pb-24 md:pb-8',
        tier && 'max-md:overflow-x-clip max-md:bg-m-surface-low max-md:pb-4',
      )}
    >
      {tier && (
        <div className="bg-m-surface-low">
          <MobileTopBar
            title={
              <>
                Cart
                {itemCount > 0 && (
                  <span className="font-normal text-m-on-surface-variant">
                    {' '}
                    · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                  </span>
                )}
              </>
            }
          />
        </div>
      )}
      <div className={clsx('container-custom min-w-0 py-5 md:py-6', tier && 'max-md:pt-1')}>
        <div className={clsx(tier && 'max-md:hidden')}>
          <PageHeader
            title="Shopping Cart"
            subtitle={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
            backHref="/"
            backLabel="Continue shopping"
          />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-6 py-12 shadow-sm">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
            </div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-xs md:text-sm text-gray-600 mb-5 text-center max-w-md">
              Looks like you have not added anything to your cart yet. Start shopping to fill it up!
            </p>
            <Link href="/">
              <Button variant="primary" size="sm">
                <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {tier && (
              <MobileCartList
                items={items}
                subtotal={subtotal}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
              />
            )}
            <div className={clsx('grid min-w-0 gap-4 md:gap-6 lg:grid-cols-3', tier && 'max-md:hidden')}>
              <div className="min-w-0 space-y-3 md:space-y-4 lg:col-span-2">
                {items.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
              </div>

              <div className="min-w-0 lg:col-span-1">
                <CartSummary
                  subtotal={subtotal}
                  discount={discount}
                  shipping={shipping}
                  tax={tax}
                  total={total}
                  itemCount={itemCount}
                  onCheckout={handleCheckout}
                />
              </div>
            </div>
            {tier && (
              <StickyActionBar aboveTabBar className="flex-col items-stretch gap-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-m-body-m text-m-on-surface-variant">Subtotal · delivery at checkout</span>
                  <span className="text-lg font-bold tabular-nums text-m-on-surface">₦{subtotal.toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckout}
                  className="h-12 w-full rounded-full bg-m-primary text-m-label-l text-m-on-primary shadow-[0_1px_2px_rgb(60_4_69/0.3)] active:opacity-90"
                >
                  Checkout
                </button>
              </StickyActionBar>
            )}
          </>
        )}
      </div>
    </main>
  );
}
