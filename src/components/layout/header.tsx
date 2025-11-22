'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, ShoppingCart } from 'lucide-react';
import MobileMenu from '@/components/layout/mobile-menu';
import { useCart } from '@/hooks/use-cart';

export default function Header() {
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';
  const logoWidth = Number(process.env.NEXT_PUBLIC_LOGO_WIDTH) || 40;
  const logoHeight = Number(process.env.NEXT_PUBLIC_LOGO_HEIGHT) || 40;
  const logoAlt = process.env.NEXT_PUBLIC_LOGO_TEXT || 'Home';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top Bar */}
      <div className="bg-primary-600 text-white py-2 px-4 text-center text-sm">
        <p>Free Shipping on Orders Over ₦10,000 🎉</p>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-3 md:py-4">
        {/* Unified layout: logo + search, compact and inline */}
        <div className="flex items-center gap-3 md:gap-4">
          {/* Desktop menu toggle */}
          <button
            className="hidden md:inline-flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 border border-gray-200"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          <Link href="/" className="flex-shrink-0 hidden md:inline-flex">
            <Image
              src={logoSrc}
              alt={logoAlt}
              width={logoWidth}
              height={logoHeight}
              priority
              className="h-9 w-auto md:h-10 object-contain"
            />
          </Link>

          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search for products, brands and categories..."
              className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary-500 hover:bg-secondary-600 text-white px-5 md:px-6 py-1.5 rounded-md transition-colors">
              Search
            </button>
          </div>

          {/* Desktop cart icon */}
          <Link
            href="/cart"
            className="hidden md:inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-secondary-500 text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                  {itemCount > 9 ? '9+' : itemCount}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-800">Cart</span>
          </Link>
        </div>
      </div>

      {/* Menu Drawer for desktop */}
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} showOnDesktop />
    </header>
  );
}
