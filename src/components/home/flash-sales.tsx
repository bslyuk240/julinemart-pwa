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
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-3 md:gap-4 pb-2">
              {products.slice(0, 12).map((product) => (
                <div
                  key={product.id}
                  className="w-1/2 sm:w-1/3 md:w-1/5 flex-shrink-0"
                >
                  <ProductCard product={product} showBadge fullWidth />
                </div>
              ))}
            </div>
          </div>
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
