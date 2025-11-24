'use client';

import Link from 'next/link';
import { TrendingUp, ChevronRight } from 'lucide-react';
import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface TrendingSectionProps {
  products: Product[];
}

export default function TrendingSection({ products }: TrendingSectionProps) {
  return (
    <section className="bg-gray-50 py-3 md:py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 p-1.5 md:p-2 rounded-lg">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-primary-900">Trending Products</h2>
              <p className="text-[10px] md:text-sm text-gray-600 hidden sm:block">Most popular items right now</p>
            </div>
          </div>

          <Link 
            href="/products" 
            className="flex items-center gap-1 text-secondary-500 hover:text-secondary-600 font-medium text-xs md:text-sm group"
          >
            See All
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {products.length > 0 ? (
          // GRID LAYOUT - 6 columns on desktop with rank badges
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
            {products.slice(0, 18).map((product, index) => (
              <div key={product.id} className="relative">
                {/* Rank Badge for top 3 */}
                {index < 3 && (
                  <div className="absolute top-1.5 left-1.5 z-10 bg-secondary-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-lg">
                    #{index + 1}
                  </div>
                )}
                <ProductCard product={product} fullWidth />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 bg-white rounded-lg">
            <TrendingUp className="w-8 h-8 md:w-12 md:h-12 text-gray-300 mx-auto mb-2 md:mb-3" />
            <p className="text-gray-500 text-sm">No trending products at the moment</p>
          </div>
        )}
      </div>
    </section>
  );
}