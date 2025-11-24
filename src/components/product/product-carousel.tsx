'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './product-card';
import { Product } from '@/types/product';

interface ProductCarouselProps {
  products: Product[];
  title?: string;
  showBadge?: boolean;
}

export default function ProductCarousel({
  products,
  title,
  showBadge = false,
}: ProductCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth',
      });
    }
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Title */}
      {title && (
        <h2 className="text-xl md:text-2xl font-bold text-primary-900 mb-4">
          {title}
        </h2>
      )}

      {/* Navigation Buttons */}
      <button
        onClick={() => scroll('left')}
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Scroll left"
      >
        <ChevronLeft className="w-6 h-6 text-gray-700" />
      </button>

      <button
        onClick={() => scroll('right')}
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Scroll right"
      >
        <ChevronRight className="w-6 h-6 text-gray-700" />
      </button>

      {/* Carousel Container */}
      <div
        ref={scrollContainerRef}
        className="grid grid-flow-col auto-cols-[minmax(120px,_calc((100%-24px)/3))] md:auto-cols-[minmax(180px,_calc((100%-32px)/3))] lg:auto-cols-[minmax(200px,_calc((100%-32px)/3))] gap-3 md:gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4 snap-x snap-mandatory"
      >
        {products.map((product) => (
          <div key={product.id} className="snap-start">
            <ProductCard product={product} showBadge={showBadge} />
          </div>
        ))}
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
    </div>
  );
}
