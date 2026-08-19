'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { useGiftBoxFavorites } from '@/hooks/use-gift-box-favorites';

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { itemCount: giftBoxFavoriteCount } = useGiftBoxFavorites();

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
    },
    {
      name: 'Categories',
      href: '/categories',
      icon: LayoutGrid,
    },
    {
      name: 'Cart',
      href: '/cart',
      icon: ShoppingCart,
      badge: itemCount,
    },
    {
      name: 'Wishlist',
      href: '/wishlist',
      icon: Heart,
      badge: wishlistCount + giftBoxFavoriteCount,
    },
    {
      name: 'Account',
      href: '/account',
      icon: User,
    },
  ];

  return (
    <nav
      className="fixed left-0 right-0 bg-white border-t border-gray-200 md:hidden z-[60] pb-[env(safe-area-inset-bottom)]"
      style={{
        transform: 'translateZ(0)',
        bottom: 'var(--jm-vv-bottom-inset, 0px)',
      }}
    >
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-[52px]',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {(item.badge ?? 0) > 0 && (
                  <span className="absolute -top-2 -right-1.5 bg-secondary-500 text-white text-[10px] font-bold rounded-full w-[18px] h-[18px] flex items-center justify-center">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
