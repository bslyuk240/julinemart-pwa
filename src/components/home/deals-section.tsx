'use client';

import Link from 'next/link';
import { Tag, ChevronRight } from 'lucide-react';
import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface DealsSectionProps {
  products: Product[];
  title?: string;
  subtitle?: string;
}

export default function DealsSection({ 
  products, 
  title = "Today's Deals",
  subtitle = "Handpicked deals just for you"
}: DealsSectionProps) {
  return (
    <section className="py-6 md:py-8 bg-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-2 rounded-lg">
              <Tag className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-primary-900">{title}</h2>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>

          <Link 
            href="/products" 
            className="flex items-center gap-1 text-secondary-500 hover:text-secondary-600 font-medium text-sm md:text-base group"
          >
            View All
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No deals available at the moment</p>
            <Link 
              href="/products" 
              className="inline-block mt-4 text-secondary-500 hover:text-secondary-600 font-medium"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* View More Button */}
        {products.length > 10 && (
          <div className="text-center mt-6">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              View More Deals
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}