'use client';

import { LayoutGrid } from 'lucide-react';
import ProductCard from '../product/product-card';
import type { Product } from '@/types/product';

interface GenericProductSectionProps {
  title: string;
  products: Product[];
}

export default function GenericProductSection({ title, products }: GenericProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-white py-3 md:py-6">
      <div className="container-custom min-w-0">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-1.5 md:p-2 rounded-lg">
            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          <h2 className="text-base md:text-xl font-bold text-primary-900">{title}</h2>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-3 md:gap-4 min-w-full snap-x snap-mandatory">
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[170px] sm:w-[200px] md:w-[230px] lg:w-[260px] flex-shrink-0 snap-start"
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
