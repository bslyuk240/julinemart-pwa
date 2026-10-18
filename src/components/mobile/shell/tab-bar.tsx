'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Heart, User, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { useGiftBoxFavorites } from '@/hooks/use-gift-box-favorites';
import { activeTab, TABS, type TabId } from '@/lib/mobile/tabs';
import { haptic } from '@/lib/mobile/haptics';

const ICONS: Record<TabId, LucideIcon> = {
  home: Home,
  categories: LayoutGrid,
  cart: ShoppingCart,
  wishlist: Heart,
  account: User,
};

/**
 * Material 3 navigation bar for mobile-tier routes. Server-rendered (no pop-in),
 * badges fill in after hydration via the hydration-safe store hooks.
 */
export default function TabBar() {
  const pathname = usePathname();
  const current = activeTab(pathname);
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { itemCount: giftBoxFavoriteCount } = useGiftBoxFavorites();
  const badges: Partial<Record<TabId, number>> = {
    cart: itemCount,
    wishlist: wishlistCount + giftBoxFavoriteCount,
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 z-m-bar grid grid-cols-5 bg-m-surface-container md:hidden"
      style={{
        bottom: 'var(--jm-vv-bottom-inset, 0px)',
        height: 'var(--m-tabbar-h)',
        paddingBottom: 'var(--m-safe-bottom)',
      }}
    >
      {TABS.map((tab) => {
        const Icon = ICONS[tab.id];
        const isActive = current === tab.id;
        const badge = badges[tab.id] ?? 0;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => {
              if (isActive) {
                // Re-tapping the active tab scrolls back to the top, as native apps do.
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else {
                haptic('tap');
              }
            }}
            className={clsx(
              'flex flex-col items-center gap-1 pt-3 text-m-label-m',
              isActive ? 'text-m-on-surface' : 'text-m-on-surface-variant',
            )}
          >
            <span
              className={clsx(
                'relative grid h-8 w-16 place-items-center rounded-full transition-colors duration-200 ease-m-standard',
                isActive && 'bg-m-primary-container text-m-on-primary-container',
              )}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
              {badge > 0 && (
                <span className="absolute -top-0.5 right-3 min-w-4 rounded-full bg-m-error px-1 text-center text-[11px] font-semibold leading-4 text-white">
                  {badge > 9 ? '9+' : badge}
                  <span className="sr-only"> items</span>
                </span>
              )}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
