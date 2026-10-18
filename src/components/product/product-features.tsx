'use client';

import Link from 'next/link';
import { Shield, RotateCcw, Truck, ChevronRight } from 'lucide-react';
import { useFreeShipping } from '@/hooks/use-free-shipping';

interface ProductFeaturesProps {
  className?: string;
  /** `tiles`: three centred tiles (default). `list`: Material list rows for the mobile tier. */
  variant?: 'tiles' | 'list';
}

// Return window shown on product pages; matches the store return policy.
const RETURN_DAYS = 3;

export default function ProductFeatures({ className = '', variant = 'tiles' }: ProductFeaturesProps) {
  const { threshold, loading } = useFreeShipping();

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;
  // Only advertise free delivery while JLO has a live offer; 0 means every order qualifies.
  const hasOffer = threshold !== null;
  const deliveryTitle = hasOffer ? 'Free Delivery' : 'Nationwide Delivery';
  const deliveryDetail = loading
    ? 'Loading...'
    : !hasOffer
      ? 'Calculated at checkout'
      : threshold > 0
        ? `On orders over ${formatPrice(threshold)}`
        : 'On every order';

  if (variant === 'list') {
    return (
      <div className={className}>
        <div className="flex min-h-16 items-center gap-4 px-4 py-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-m-surface-container text-m-on-surface-variant">
            <Truck className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium leading-5 text-m-on-surface">{deliveryTitle}</span>
            <span className="block text-m-body-m text-m-on-surface-variant">{deliveryDetail}</span>
          </span>
        </div>
        <Link href="/page/terms-of-service" className="flex min-h-16 items-center gap-4 px-4 py-2 active:bg-black/5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-m-success-container text-m-success">
            <Shield className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium leading-5 text-m-on-surface">JulineMart Protect</span>
            <span className="block text-m-body-m text-m-on-surface-variant">
              Covered if it doesn&apos;t arrive, arrives damaged or is the wrong item
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-m-on-surface-variant" aria-hidden />
        </Link>
        <Link href="/page/refund_returns" className="flex min-h-16 items-center gap-4 px-4 py-2 active:bg-black/5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-m-surface-container text-m-on-surface-variant">
            <RotateCcw className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-medium leading-5 text-m-on-surface">
            {`${RETURN_DAYS}-day returns`}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-m-on-surface-variant" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-3 gap-3 md:gap-4 ${className}`}>
      <div className="text-center">
        <Truck className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">
          {deliveryTitle}
        </p>
        <p className="text-[11px] md:text-xs text-gray-500">
          {deliveryDetail}
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
