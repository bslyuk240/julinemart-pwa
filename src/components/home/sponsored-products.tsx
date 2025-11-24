'use client';

import Link from 'next/link';
import { Megaphone, ChevronRight, Star } from 'lucide-react';
import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface SponsoredProductsProps {
  products: Product[];
}

export default function SponsoredProducts({ products }: SponsoredProductsProps) {
  return (
    <section className="bg-gradient-to-br from-purple-50 via-white to-purple-50 py-3 md:py-6 border-y border-purple-100">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-1.5 md:p-2 rounded-lg shadow-md">
              <Megaphone className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-xl font-bold text-primary-900">Sponsored Products</h2>
                <span className="bg-purple-100 text-purple-700 text-[9px] md:text-xs font-semibold px-2 py-0.5 rounded-full">
                  FEATURED
                </span>
              </div>
              <p className="text-[10px] md:text-sm text-gray-600 hidden sm:block">Premium brands & official stores</p>
            </div>
          </div>

          <Link 
            href="/products?sponsored=true" 
            className="flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium text-xs md:text-sm group"
          >
            View All
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {products.length > 0 ? (
          // GRID LAYOUT - 6 columns on desktop with sponsored badge
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
            {products.slice(0, 18).map((product) => (
              <div key={product.id} className="relative">
                {/* Sponsored Badge */}
                <div className="absolute top-1.5 right-1.5 z-10 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-white" />
                  SPONSORED
                </div>
                <ProductCard product={product} fullWidth />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 bg-white/70 rounded-lg border border-purple-100">
            <Megaphone className="w-8 h-8 md:w-12 md:h-12 text-purple-300 mx-auto mb-2 md:mb-3" />
            <p className="text-gray-500 text-sm">No sponsored products at the moment</p>
            <Link 
              href="/products" 
              className="inline-block mt-3 md:mt-4 text-purple-600 hover:text-purple-700 font-medium text-sm"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}