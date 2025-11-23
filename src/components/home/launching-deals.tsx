'use client';

import Link from 'next/link';
import { Rocket, ChevronRight, Zap } from 'lucide-react';
import ProductCard from '../product/product-card';
import { Product } from '@/types/product';

interface LaunchingDealsProps {
  products: Product[];
}

// Calculate discount percentage
function calculateDiscount(regularPrice: string, salePrice: string): number {
  const regular = parseFloat(regularPrice);
  const sale = parseFloat(salePrice);
  
  if (!regular || !sale || regular <= sale) return 0;
  
  return Math.round(((regular - sale) / regular) * 100);
}

export default function LaunchingDeals({ products }: LaunchingDealsProps) {
  return (
    <section className="bg-gradient-to-br from-green-50 via-emerald-50 to-white py-3 md:py-6">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 p-1.5 md:p-2 rounded-lg shadow-md">
              <Rocket className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-xl font-bold text-primary-900">Launching Deals</h2>
                <div className="flex items-center gap-1 bg-green-100 text-green-700 text-[9px] md:text-xs font-semibold px-2 py-0.5 rounded-full">
                  <Zap className="w-2.5 h-2.5 md:w-3 md:h-3 fill-green-600" />
                  NEW
                </div>
              </div>
              <p className="text-[10px] md:text-sm text-gray-600 hidden sm:block">Exclusive launch discounts - Limited time only!</p>
            </div>
          </div>

          <Link 
            href="/products?launching=true" 
            className="flex items-center gap-1 text-green-600 hover:text-green-700 font-medium text-xs md:text-sm group"
          >
            View All
            <ChevronRight className="w-3 h-3 md:w-4 md:h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {products.length > 0 ? (
          // GRID LAYOUT - Shows up to 3 rows (15 products total)
          // Mobile: 2 columns, Tablet: 3 columns, Desktop: 5 columns
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {products.slice(0, 15).map((product) => {
              const discount = product.on_sale && product.sale_price && product.regular_price
                ? calculateDiscount(product.regular_price, product.sale_price)
                : 0;

              return (
                <div
                  key={product.id}
                  className="relative"
                >
                  {/* Discount Badge - Only show if there's a discount */}
                  {discount > 0 && (
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <div className="bg-gradient-to-br from-red-500 to-red-600 text-white px-2 py-1 rounded-lg shadow-lg">
                        <div className="text-xs md:text-sm font-bold leading-none">-{discount}%</div>
                        <div className="text-[8px] md:text-[9px] uppercase tracking-wide opacity-90">OFF</div>
                      </div>
                    </div>
                  )}

                  {/* Launch Badge */}
                  <div className="absolute top-1.5 right-1.5 z-10 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[8px] md:text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                    <Rocket className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    LAUNCH
                  </div>

                  <ProductCard product={product} fullWidth />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 md:py-12 bg-white/70 rounded-lg border border-green-100">
            <Rocket className="w-8 h-8 md:w-12 md:h-12 text-green-300 mx-auto mb-2 md:mb-3" />
            <p className="text-gray-500 text-sm">No launch deals available right now</p>
            <p className="text-xs text-gray-400 mt-1">Check back soon for new product launches!</p>
            <Link 
              href="/products" 
              className="inline-block mt-3 md:mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Browse All Products
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}