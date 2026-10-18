'use client';

import { Shield, RotateCcw, Truck } from 'lucide-react';
import { useFreeShipping } from '@/hooks/use-free-shipping';

interface ProductFeaturesProps {
  className?: string;
}

// Return window shown on product pages; matches the store return policy.
const RETURN_DAYS = 3;

export default function ProductFeatures({ className = '' }: ProductFeaturesProps) {
  const { threshold, loading } = useFreeShipping();

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;
  // Only advertise free delivery while JLO has a live offer; 0 means every order qualifies.
  const hasOffer = threshold !== null;

  return (
    <div className={`grid grid-cols-3 gap-3 md:gap-4 ${className}`}>
      <div className="text-center">
        <Truck className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">
          {hasOffer ? 'Free Delivery' : 'Nationwide Delivery'}
        </p>
        <p className="text-[11px] md:text-xs text-gray-500">
          {loading
            ? 'Loading...'
            : !hasOffer
              ? 'Calculated at checkout'
              : threshold > 0
                ? `On orders over ${formatPrice(threshold)}`
                : 'On every order'}
        </p>
      </div>
      
      <div className="text-center">
        <Shield className="w-5 h-5 md:w-7 md:h-7 text-emerald-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">JulineMart Protect</p>
        <p className="text-[11px] md:text-xs text-gray-500">Purchase protection</p>
      </div>
      
      <div className="text-center">
        <RotateCcw className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">Easy Returns</p>
        <p className="text-[11px] md:text-xs text-gray-500">
          {`${RETURN_DAYS}-day return`}
        </p>
      </div>
    </div>
  );
}
