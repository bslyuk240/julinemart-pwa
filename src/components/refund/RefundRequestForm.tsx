'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { isOrderEligibleForRefund, canOrderBeRefunded, formatRefundStatus, RefundRequestMeta } from '@/lib/woocommerce/refunds';
import { useAuth } from '@/hooks/use-auth';
import { Order } from '@/types/order';

interface RefundRequestFormProps {
  orderId: number;
}

const REFUND_REASONS = [
  { value: 'damaged', label: 'Item arrived damaged' },
  { value: 'wrong_item', label: 'Received wrong item' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'quality_issue', label: 'Quality not satisfactory' },
  { value: 'size_issue', label: 'Wrong size/fit' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'late_delivery', label: 'Delivered too late' },
  { value: 'other', label: 'Other reason' },
];

export default function RefundRequestForm({ orderId }: RefundRequestFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<RefundRequestMeta | null>(null);
  const [eligibility, setEligibility] = useState<{
    eligible: boolean;
    daysRemaining: number;
    reason?: string;
  } | null>(null);

  // Form state
  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');

  useEffect(() => {
    fetchOrderAndEligibility();
  }, [orderId]);

  const fetchOrderAndEligibility = async () => {
    try {
      setLoading(true);

      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const { order: orderData, refundRequest } = await res.json();
      if (!orderData) {
        toast.error('Order not found');
        router.push('/account/orders');
        return;
      }
      setOrder(orderData);
      if (refundRequest) setExistingRequest(refundRequest);

      // Check order status eligibility
      if (!canOrderBeRefunded(orderData.status)) {
        setEligibility({
          eligible: false,
          daysRemaining: 0,
          reason: `Orders with status "${orderData.status}" cannot be refunded`,
        });
        return;
      }

      // Check time-based eligibility
      const policyRes = await fetch('/api/policies/refund');
      const refundPolicy = policyRes.ok ? await policyRes.json() : { days: 3 };
      const eligibilityResult = isOrderEligibleForRefund(
        orderData.date_completed || orderData.date_created,
        refundPolicy.days
      );
      setEligibility(eligibilityResult);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error('Please select a reason for your refund request');
      return;
    }

    if (reason === 'other' && !reasonDetails) {
      toast.error('Please provide details for your refund request');
      return;
    }

    if (!order) return;

    try {
      setSubmitting(true);

      const fullReason =
        reason === 'other'
          ? reasonDetails
          : `${REFUND_REASONS.find((r) => r.value === reason)?.label}${
              reasonDetails ? `: ${reasonDetails}` : ''
            }`;

      const response = await fetch(`/api/orders/${order.id}/refund-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: fullReason,
          amount: parseFloat(order.total),
          customerEmail: user?.email || order.billing?.email || '',
          customerName: (
            user?.name ||
            `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`
          ).trim(),
        }),
      });

      const submitResult = await response.json();
      if (!response.ok || !submitResult.success) {
        throw new Error(submitResult.message || 'Failed to submit refund request');
      }

      toast.success('Refund request submitted successfully!');
      await fetchOrderAndEligibility();
    } catch (error: any) {
      console.error('Error submitting refund:', error);
      toast.error(error.message || 'Failed to submit refund request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number | string) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return `₦${num.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <Link href="/account/orders" className="text-primary-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Show existing request status
  if (existingRequest) {
    const status = formatRefundStatus(existingRequest.status);

    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/account/orders/${orderId}`}
              className="text-gray-600 hover:text-primary-600"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Refund Request Status</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              {existingRequest.status === 'processed' && (
                <CheckCircle className="w-12 h-12 text-green-500" />
              )}
              {existingRequest.status === 'pending' && (
                <Clock className="w-12 h-12 text-yellow-500" />
              )}
              {existingRequest.status === 'approved' && (
                <CheckCircle className="w-12 h-12 text-blue-500" />
              )}
              {(existingRequest.status === 'rejected') && (
                <XCircle className="w-12 h-12 text-red-500" />
              )}

              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                >
                  {status.label}
                </span>
                <p className="text-gray-600 mt-1">
                  Submitted: {new Date(existingRequest.requested_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Order Number</span>
                <span className="font-medium">#{order.number}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-gray-600">Refund Amount</span>
                <span className="font-medium">
                  {formatPrice(existingRequest.requested_amount ?? 0)}
                </span>
              </div>
              <div className="py-3">
                <span className="text-gray-600 block mb-2">Reason</span>
                <p className="text-gray-900">{existingRequest.reason}</p>
              </div>

              {existingRequest.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium">Rejection Reason:</p>
                  <p className="text-red-700 mt-1">{existingRequest.rejection_reason}</p>
                </div>
              )}

              {existingRequest.status === 'processed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800">
                    Your refund has been processed. It will be credited to your original
                    payment method within 5-7 business days.
                  </p>
                </div>
              )}

              {existingRequest.status === 'pending' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-800">
                    Your refund request is being reviewed. You'll receive an update soon.
                    This usually takes 24-48 hours.
                  </p>
                </div>
              )}

              {existingRequest.status === 'approved' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">
                    Your refund has been approved! We're now processing the payment. You'll
                    receive your refund within 5-7 business days.
                  </p>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/account/orders"
            className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      </main>
    );
  }

  // Show eligibility error
  if (eligibility && !eligibility.eligible) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href={`/account/orders/${orderId}`}
              className="text-gray-600 hover:text-primary-600"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Request Refund</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Not Eligible for Refund
              </h2>
              <p className="text-gray-600 mb-6">{eligibility.reason}</p>
              <Link
                href={`/account/orders/${orderId}`}
                className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Back to Order
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Show refund request form
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/account/orders/${orderId}`}
            className="text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Request Refund</h1>
        </div>

        {eligibility && eligibility.eligible && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium">Eligible for Refund</p>
              <p className="text-green-700 text-sm">
                {eligibility.daysRemaining} days remaining in your refund window
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number</span>
              <span className="font-medium">#{order.number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Date</span>
              <span className="font-medium">
                {new Date(order.date_created).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order Total</span>
              <span className="font-medium">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Refund Details</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Refund <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a reason</option>
              {REFUND_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Details{' '}
              {reason === 'other' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={reasonDetails}
              onChange={(e) => setReasonDetails(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Please provide more details about your refund request..."
              required={reason === 'other'}
            />
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Refund Policy</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Items must be unused and in original packaging</li>
              <li>• Refunds are processed within 5-7 business days</li>
              <li>• Refund will be credited to your original payment method</li>
              <li>• Shipping costs are non-refundable</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting || !reason}
            className="w-full py-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Refund Request'
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
