'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

export default function Header() {
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
          <Link href="/" className="flex-shrink-0">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-primary-600 to-primary-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg md:text-xl">J</span>
            </div>
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
        </div>
      </div>
    </header>
  );
}
