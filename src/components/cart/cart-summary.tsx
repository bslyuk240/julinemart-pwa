'use client';

import { Button } from '../ui/button';
import { ShoppingBag, Tag } from 'lucide-react';

interface CartSummaryProps {
  subtotal: number;
  discount?: number;
  shipping?: number;
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
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-200">
        <ShoppingBag className="w-5 h-5 text-primary-600" />
        <h2 className="text-xl font-bold text-primary-900">Order Summary</h2>
      </div>

      {/* Summary Details */}
      <div className="space-y-4 mb-6">
        {/* Subtotal */}
        <div className="flex justify-between text-gray-700">
          <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>

        {/* Discount */}
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span className="flex items-center gap-1">
              <Tag className="w-4 h-4" />
              Discount
            </span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}

        {/* Shipping */}
        <div className="flex justify-between text-gray-700">
          <span>Shipping</span>
          {shipping === 0 ? (
            <span className="text-green-600 font-medium">FREE</span>
          ) : (
            <span className="font-medium">{formatPrice(shipping)}</span>
          )}
        </div>

        {/* Tax */}
        {tax > 0 && (
          <div className="flex justify-between text-gray-700">
            <span>Tax</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-primary-600">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Checkout Button */}
      <Button
        onClick={onCheckout}
        variant="primary"
        size="lg"
        fullWidth
        isLoading={isLoading}
        disabled={itemCount === 0}
        className="mb-4"
      >
        {isLoading ? 'Processing...' : 'Proceed to Checkout'}
      </Button>

      {/* Additional Info */}
      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Free shipping on orders over ₦10,000</span>
        </div>
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
          <span>Easy returns within 7 days</span>
        </div>
      </div>

      {/* Promo Code Section */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter promo code"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <Button variant="outline" size="md">
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
