'use client';

import Link from 'next/link';
import { Flame, ChevronRight } from 'lucide-react';
import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface FlashSalesProps {
  products: Product[];
}

export default function FlashSales({ products }: FlashSalesProps) {
  return (
    <section className="bg-gradient-to-br from-secondary-200 via-secondary-100 to-white py-3 md:py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-white/80 border border-secondary-300 p-1.5 md:p-2">
              <Flame className="h-4 w-4 md:h-5 md:w-5 text-secondary-700" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs uppercase tracking-wide text-secondary-700">Limited time</p>
              <h2 className="text-base md:text-2xl font-bold text-gray-900">Flash Sales</h2>
            </div>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1 text-xs md:text-sm font-semibold text-secondary-600 transition hover:text-secondary-700"
          >
            View all
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
          </Link>
        </div>

        {products.length > 0 ? (
          <>
            {/* Mobile: Horizontal Scroll */}
            <div className="md:hidden overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-3 pb-2">
                {products.slice(0, 10).map((product) => (
                  <ProductCard key={product.id} product={product} showBadge />
                ))}
              </div>
            </div>

            {/* Desktop: Grid Layout */}
            <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {products.slice(0, 10).map((product) => (
                <ProductCard key={product.id} product={product} showBadge />
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-secondary-200 bg-white/70 p-4 md:p-6 text-secondary-700 shadow-sm text-sm">
            Flash sale items will appear here soon.
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
