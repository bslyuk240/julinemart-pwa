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
    <section className="bg-white py-3 md:py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-1.5 md:p-2 rounded-lg">
              <Tag className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-primary-900">{title}</h2>
              <p className="text-[10px] md:text-sm text-gray-600 hidden sm:block">{subtitle}</p>
            </div>
          </div>

          <Link 
            href="/products" 
            className="flex items-center gap-1 text-secondary-500 hover:text-secondary-600 font-medium text-xs md:text-sm group"
          >
            View All
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3 md:gap-4 pb-2">
              {products.slice(0, 12).map((product) => (
                <div
                  key={product.id}
                  className="w-1/3 sm:w-1/4 md:w-1/5 flex-shrink-0"
                >
                  <ProductCard product={product} fullWidth />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 bg-gray-50 rounded-lg">
            <Tag className="w-8 h-8 md:w-12 md:h-12 text-gray-300 mx-auto mb-2 md:mb-3" />
            <p className="text-gray-500 text-sm">No deals available at the moment</p>
            <Link 
              href="/products" 
              className="inline-block mt-3 md:mt-4 text-secondary-500 hover:text-secondary-600 font-medium text-sm"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
