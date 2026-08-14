'use client';

import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import ProductCard from '@/components/product/product-card';
import type { Product } from '@/types/product';

interface LocalMakersSectionProps {
  products: Product[];
}

export default function LocalMakersSection({ products }: LocalMakersSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-white py-3 md:py-6">
      <div className="container-custom min-w-0">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 md:p-2">
              <Sparkles className="h-4 w-4 text-white md:h-5 md:w-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 md:text-xs">
                Trusted local commerce
              </p>
              <h2 className="text-base font-bold text-gray-900 md:text-xl">Local Makers</h2>
            </div>
          </div>
          <Link
            href="/products?tag=handmade"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 md:text-sm"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-full snap-x snap-mandatory gap-3 md:gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[170px] flex-shrink-0 snap-start sm:w-[200px] md:w-[230px] lg:w-[260px]"
              >
                <ProductCard product={product} fullWidth />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
