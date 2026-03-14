'use client';

import Link from 'next/link';
import { ChevronRight, Zap } from 'lucide-react';
import ProductCard from '../product/product-card';
import type { Product } from '@/types/product';

interface CategoryProductsSectionProps {
  products: Product[];
  title: string;
  subtitle: string;
  href: string;
  sectionClassName: string;
  accentClassName: string;
  linkClassName: string;
}

export default function CategoryProductsSection({
  products,
  title,
  subtitle,
  href,
  sectionClassName,
  accentClassName,
  linkClassName,
}: CategoryProductsSectionProps) {
  return (
    <section className={`${sectionClassName} py-3 md:py-6`}>
      <div className="container mx-auto px-4">
        <div className="mb-3 flex items-center justify-between md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className={`rounded-lg p-1.5 shadow-md md:p-2 ${accentClassName}`}>
              <Zap className="h-4 w-4 text-white md:h-5 md:w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide md:text-xs">{subtitle}</p>
              <h2 className="text-base font-bold text-primary-900 md:text-xl">{title}</h2>
            </div>
          </div>

          <Link
            href={href}
            className={`flex items-center gap-1 text-xs font-medium transition md:text-sm ${linkClassName}`}
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
