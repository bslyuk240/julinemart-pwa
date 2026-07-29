'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, Truck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageLoading from '@/components/ui/page-loading';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  // New flow passes ?ref=1042 (order_number); legacy flow may pass ?order=<uuid>
  const ref = searchParams.get('ref') || searchParams.get('order');
  // ORDER_PLACED is logged authoritatively server-side in JLO create-order
  // (captures guests too), so no client-side logging here.

  // Determine display label — if it's a plain number show #1042, else show as-is
  const isNumeric = ref && /^\d+$/.test(ref);
  const orderLabel = ref ? (isNumeric ? `#${ref}` : ref) : null;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom py-5 md:py-12">
        <div className="max-w-2xl mx-auto">

          {/* Success Icon + Heading */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
              <CheckCircle className="w-14 h-14 text-green-600" />
            </div>
            <h1 className="text-base md:text-xl font-bold text-gray-900 mb-3">
              Order Placed!
            </h1>
            <p className="text-gray-600 text-xs md:text-sm">
              Thank you for shopping with JulineMart. Your order has been received.
            </p>
          </div>

          {/* Order Number Card */}
          <div className="bg-primary-600 text-white rounded-2xl p-8 mb-6 text-center shadow-lg">
            <p className="text-primary-200 text-sm uppercase tracking-widest mb-2 font-medium">
              Your Order Number
            </p>
            <p className="text-5xl font-extrabold tracking-tight mb-1">
              {orderLabel ?? '—'}
            </p>
            <p className="text-primary-200 text-sm mt-3">
              Save this number — you'll need it to track your order or contact support
            </p>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
              <Truck className="w-5 h-5 text-primary-600" />
              What happens next?
            </h2>
            <ol className="space-y-4">
              {[
                { step: '1', text: "You'll receive an order confirmation email shortly" },
                { step: '2', text: "We'll process your order and prepare it for dispatch" },
                { step: '3', text: "You'll get a tracking number once your order ships" },
                { step: '4', text: 'Your order will be delivered to your specified address' },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {step}
                  </span>
                  <span className="text-gray-700 pt-0.5">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link href="/" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">
                Continue Shopping
              </Button>
            </Link>
            <Link href="/orders" className="flex-1">
              <Button variant="primary" size="sm" className="w-full">
                <Package className="w-3.5 h-3.5 mr-1.5" />
                View My Orders
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Support */}
          <p className="text-center text-sm text-gray-500 mt-8">
            Need help?{' '}
            <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
              Contact Support
            </Link>{' '}
            and quote your order number {orderLabel && <strong>{orderLabel}</strong>}.
          </p>

        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading..." />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
