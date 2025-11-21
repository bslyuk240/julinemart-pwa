'use client';

import Link from 'next/link';
import { Flame } from 'lucide-react';

import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface FlashSalesProps {
  products: Product[];
}

export default function FlashSales({ products }: FlashSalesProps) {
  return (
    <section className="bg-gradient-to-br from-secondary-50 via-white to-primary-50 py-8">
      <div className="container mx-auto px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-secondary-500/10 p-2">
              <Flame className="h-5 w-5 text-secondary-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-600">Limited time</p>
              <h2 className="text-2xl font-bold text-gray-900">Flash Sales</h2>
            </div>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-secondary-600 transition hover:text-secondary-700"
          >
            View all
          </Link>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.id} product={product} showBadge />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-secondary-200 bg-white/70 p-6 text-secondary-700 shadow-sm">
            Flash sale items will appear here soon.
          </div>
        )}
      </div>
    </section>
  );
}
