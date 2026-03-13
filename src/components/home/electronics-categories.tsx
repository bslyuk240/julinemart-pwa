import Link from 'next/link';
import { ChevronRight, Zap } from 'lucide-react';
import ProductCard from '../product/product-card';
import type { Product } from '@/types/product';

interface ElectronicsCategoriesProps {
  products: Product[];
}

export default function ElectronicsCategories({ products }: ElectronicsCategoriesProps) {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-cyan-50 to-white py-3 md:py-6">
      <div className="container mx-auto px-4">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 p-1.5 shadow-md md:p-2">
              <Zap className="h-4 w-4 text-white md:h-5 md:w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-blue-700 md:text-xs">Shop electronics</p>
              <h2 className="text-base font-bold text-primary-900 md:text-xl">Electronics</h2>
            </div>
          </div>

          <Link
            href="/category/electronics"
            className="flex items-center gap-1 text-xs font-medium text-blue-600 transition hover:text-blue-700 md:text-sm"
          >
            View All
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Link>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="grid min-w-max grid-flow-col grid-rows-2 gap-3 md:gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="w-[170px] md:w-[210px] lg:w-[240px]"
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
