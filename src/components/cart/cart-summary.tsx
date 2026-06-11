'use client';

import { Button } from '../ui/button';
import { ShoppingBag, Tag } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  discount?: number;
  shipping?: number | null;
  tax?: number;
  total: number;
  itemCount: number;
  onCheckout: () => void;
  isLoading?: boolean;
}

export default function CartSummary({
  subtotal,
  discount = 0,
  shipping = 0,
  tax = 0,
  total,
  itemCount,
  onCheckout,
  isLoading = false,
}: CartSummaryProps) {
  const formatPrice = (price: number = 0) => `₦${Number(price || 0).toLocaleString()}`;

  return (
    <div className="sticky top-4 min-w-0 max-w-full rounded-2xl bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
        <ShoppingBag className="w-4 h-4 text-primary-600" />
        <h2 className="text-sm md:text-base font-bold text-primary-900">Order Summary</h2>
      </div>

      {/* Summary Details */}
      <div className="space-y-4 mb-6">
        {/* Subtotal */}
        <div className="flex min-w-0 items-start justify-between gap-3 text-gray-700">
          <span className="min-w-0 flex-1 break-words">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </span>
          <span className="shrink-0 text-right font-medium tabular-nums">{formatPrice(subtotal)}</span>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex min-w-0 items-start justify-between gap-3 text-green-600">
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <Tag className="h-4 w-4 shrink-0" />
              Discount
            </span>
            <span className="shrink-0 font-medium tabular-nums">-{formatPrice(discount)}</span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-gray-700">
          <span>Shipping</span>
          <span className="font-medium">
            {shipping !== undefined && shipping !== null
              ? (shipping === 0 ? 'FREE' : formatPrice(shipping))
              : 'Calculated at checkout'}
          </span>
        </div>

        {/* Tax */}
        {tax > 0 && (
          <div className="flex min-w-0 items-start justify-between gap-3 text-gray-700">
            <span className="min-w-0 flex-1">Tax</span>
            <span className="shrink-0 font-medium tabular-nums">{formatPrice(tax)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="text-sm md:text-base font-bold text-gray-900">Total</span>
            <span className="shrink-0 text-right text-base md:text-xl font-bold tabular-nums text-primary-600">
              {formatPrice(total)}
            </span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        variant="primary"
        size="sm"
        fullWidth
        isLoading={isLoading}
        disabled={itemCount === 0}
        className="mb-3"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </Button>

      {/* Additional Info */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Secure payment processing</span>
        </div>
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Easy returns within 3 days</span>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="mt-6 border-t border-gray-200 pt-6">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
          <input
            type="text"
            placeholder="Enter promo code"
            className="min-w-0 flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
            Apply
          </Button>
        </div>
      </div>

      {/* Continue Shopping Link */}
      <div className="mt-4 text-center">
        <a
          href="/"
          className="text-sm text-secondary-500 hover:text-secondary-600 font-medium inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue Shopping
        </a>
      </div>
    </div>
  );
}
