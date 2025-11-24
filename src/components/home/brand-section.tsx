'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Store } from 'lucide-react';
import { Brand } from '@/lib/woocommerce/brands';

interface BrandSectionProps {
  brands: Brand[];
}

export default function BrandSection({ brands }: BrandSectionProps) {
  if (!brands || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-8 bg-white border-y">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-1.5 md:p-2 rounded-lg shadow-md">
              <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                Shop by Brand
              </h2>
              <p className="text-xs md:text-sm text-gray-600 hidden sm:block">
                Discover products from top brands
              </p>
            </div>
          </div>

          <Link
            href="/brands"
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-medium text-xs md:text-sm group"
          >
            <span className="hidden sm:inline">View All</span>
            <span className="sm:hidden">All</span>
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12 gap-3 md:gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brand/${brand.slug}`}
              className="group"
            >
              <div className="relative bg-white border-2 border-gray-200 rounded-lg p-3 md:p-4 hover:border-primary-400 hover:shadow-md transition-all duration-200">
                {/* Brand Logo or Name */}
                {brand.image?.src ? (
                  <div className="relative aspect-square w-full">
                    <Image
                      src={brand.image.src}
                      alt={brand.image.alt || brand.name}
                      fill
                      className="object-contain p-2"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 16vw, 8vw"
                    />
                  </div>
                ) : (
                  <div className="aspect-square w-full flex items-center justify-center bg-gray-50 rounded-lg">
                    <p className="text-xs md:text-sm font-bold text-gray-700 text-center leading-tight px-1">
                      {brand.name}
                    </p>
                  </div>
                )}

                {/* Brand Name (below image) */}
                <p className="text-[10px] md:text-xs text-center text-gray-600 mt-2 truncate group-hover:text-primary-600 transition-colors">
                  {brand.name}
                </p>

                {/* Product Count */}
                {brand.count > 0 && (
                  <p className="text-[9px] md:text-[10px] text-center text-gray-400 mt-0.5">
                    {brand.count} {brand.count === 1 ? 'product' : 'products'}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Banner (optional) */}
        <div className="mt-6 md:mt-8 bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-4 md:p-6 text-center border border-primary-100">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
            Can't find your favorite brand?
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">
            We're constantly adding new brands to our marketplace
          </p>
          <Link
            href="/brands"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white text-xs md:text-sm font-semibold px-4 md:px-6 py-2 md:py-3 rounded-lg transition-colors"
          >
            Browse All Brands
          </Link>
        </div>
      </div>
    </section>
  );
}
