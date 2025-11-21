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
    <section className="py-6 md:py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-primary-900">Trending Products</h2>
              <p className="text-sm text-gray-600">Most popular items right now</p>
            </div>
          </div>

          <Link 
            href="/products" 
            className="flex items-center gap-1 text-secondary-500 hover:text-secondary-600 font-medium text-sm md:text-base group"
          >
            See All
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.slice(0, 10).map((product, index) => (
              <div key={product.id} className="relative">
                {/* Trending Badge for Top 3 */}
                {index < 3 && (
                  <div className="absolute top-2 left-2 z-10 bg-secondary-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    #{index + 1}
                  </div>
                )}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg">
            <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No trending products at the moment</p>
          </div>
        )}
      </div>
    </section>
  );
}