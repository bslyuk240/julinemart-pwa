'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingCart, Heart, Menu, User } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* Top Bar */}
      <div className="bg-primary-600 text-white py-2 px-4 text-center text-sm">
        <p>Free Shipping on Orders Over ₦10,000 🎉</p>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" aria-label="Menu">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg md:text-xl">J</span>
              </div>
              <span className="text-xl md:text-2xl font-bold text-primary-900">
                Juline<span className="text-secondary-500">Mart</span>
              </span>
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search for products, brands and categories..."
                className="w-full px-4 py-2.5 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-secondary-500 hover:bg-secondary-600 text-white px-6 py-1.5 rounded-md transition-colors">
                Search
              </button>
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Search Icon - Mobile */}
            <button 
              className="md:hidden p-2"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Search"
            >
              <Search className="w-6 h-6 text-gray-700" />
            </button>

            {/* Account */}
            <Link href="/account" className="hidden md:flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <User className="w-6 h-6 text-gray-700" />
              <div className="hidden lg:block">
                <p className="text-xs text-gray-600">Hello,</p>
                <p className="text-sm font-semibold text-gray-900">Account</p>
              </div>
            </Link>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <Heart className="w-6 h-6 text-gray-700" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isSearchOpen && (
          <div className="md:hidden mt-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                className="w-full px-4 py-2 pl-10 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}