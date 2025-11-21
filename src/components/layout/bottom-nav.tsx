'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react';
import { clsx } from 'clsx';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';

export default function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

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
      badge: wishlistCount,
    },
    {
      name: 'Account',
      href: '/account',
      icon: User,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-1.5 py-0.5 rounded-lg transition-colors min-w-[48px]',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              )}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-secondary-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9.5px] font-medium leading-tight">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
