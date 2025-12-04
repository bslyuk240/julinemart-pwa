'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, Clock, XCircle, Package, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Order } from '@/types/order';
import { canOrderBeRefunded, formatRefundStatus, RefundRequestMeta } from '@/lib/woocommerce/refunds';
import { formatPrice } from '@/lib/utils/format-price';

interface ReturnRequestFormProps {
  orderId: number;
}

const RETURN_REASONS = [
  { value: 'damaged', label: 'Item arrived damaged' },
  { value: 'wrong_item', label: 'Received wrong item' },
  { value: 'not_as_described', label: 'Item not as described' },
  { value: 'quality_issue', label: 'Quality not satisfactory' },
  { value: 'size_issue', label: 'Wrong size/fit' },
  { value: 'late_delivery', label: 'Delivered too late' },
  { value: 'other', label: 'Other reason' },
];

export default function ReturnRequestForm({ orderId }: ReturnRequestFormProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<RefundRequestMeta | null>(null);
  const [returnShipment, setReturnShipment] = useState<any>(null);
  const [eligible, setEligible] = useState<boolean>(false);

  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const currency = order?.currency || 'NGN';

  const selectedAmount =
    order?.line_items?.reduce((sum, item) => {
      const qty = selectedItems[item.id] || 0;
      const unitTotal = item.quantity ? Number(item.total) / item.quantity : 0;
      return sum + unitTotal * qty;
    }, 0) || 0;

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const createReturnShipment = async () => {
    if (!order) return null;

    const payload = {
      return_request_id: order.id,
      method: 'pickup' as const,
      customer: {
        name: `${order.shipping.first_name || order.billing.first_name} ${
          order.shipping.last_name || order.billing.last_name
        }`.trim(),
        phone: order.billing.phone,
        address: order.shipping.address_1 || order.billing.address_1,
        city: order.shipping.city || order.billing.city,
        state: order.shipping.state || order.billing.state,
      },
      hub: {
        name: 'JulineMart Returns',
        phone: order.billing.phone,
        address: order.billing.address_1,
        city: order.billing.city,
        state: order.billing.state,
      },
    };

    const res = await fetch(`/api/return-shipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to create return shipment');
    }
    return data;
  };

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const { order: orderData, returnRequest, returnShipment: shipmentMeta } = await res.json();
      if (!orderData) {
        toast.error('Order not found');
        router.push('/orders');
        return;
      }
      setOrder(orderData);
      if (returnRequest) setExistingRequest(returnRequest);
      if (shipmentMeta) setReturnShipment(shipmentMeta);
      setEligible(canOrderBeRefunded(orderData.status));
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!order) return;

    const selectedLineItems = (order.line_items || [])
      .map((item) => {
        const qty = selectedItems[item.id] || 0;
        if (!qty) return null;
        const unitTotal = item.quantity ? Number(item.total) / item.quantity : 0;
        const refundTotal = parseFloat((unitTotal * qty).toFixed(2));
        return {
          id: item.id,
          name: item.name,
          quantity: qty,
          refund_total: refundTotal,
        };
      })
      .filter(Boolean) as { id: number; name: string; quantity: number; refund_total: number }[];

    const requestedAmount = selectedLineItems.reduce(
      (sum, item) => sum + (item.refund_total || 0),
      0
    );

    if (!selectedLineItems.length || requestedAmount <= 0) {
      toast.error('Select at least one item to return');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason for your return');
      return;
    }

    if (reason === 'other' && !reasonDetails) {
      toast.error('Please provide details for your return');
      return;
    }

    try {
      setSubmitting(true);
      const fullReason =
        reason === 'other'
          ? reasonDetails
          : `${RETURN_REASONS.find((r) => r.value === reason)?.label}${
              reasonDetails ? `: ${reasonDetails}` : ''
            }`;

      const response = await fetch(`/api/orders/${order.id}/return-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: fullReason,
          line_items: selectedLineItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            refund_total: item.refund_total,
            name: item.name,
          })),
          requested_amount: requestedAmount,
          customerEmail: user?.email || order.billing?.email || '',
          customerName: (
            user?.name ||
            `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`
          ).trim(),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to submit return request');
      }

      toast.success('Return request submitted successfully!');
      try {
        const shipment = await createReturnShipment();
        if (shipment?.shipment) {
          setReturnShipment(shipment.shipment);
          toast.success(
            `Return shipment created. Code: ${shipment.shipment.return_code}${
              shipment.shipment.fez_tracking ? `, Tracking: ${shipment.shipment.fez_tracking}` : ''
            }`
          );
        }
      } catch (shipmentErr: any) {
        console.warn('Return shipment creation failed:', shipmentErr);
        toast.error(shipmentErr?.message || 'Return shipment creation failed');
      }
      router.push(`/account/orders/${order.id}/return`);
    } catch (error: any) {
      console.error('Error submitting return:', error);
      toast.error(error.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
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
          <Link href="/orders" className="text-primary-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (existingRequest) {
    const status = formatRefundStatus(existingRequest.status);
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Return Request Status</h1>
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
              {existingRequest.status === 'rejected' && (
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
              {returnShipment ? (
                <div className="py-3 border-b space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Method</span>
                    <span className="font-medium capitalize">{returnShipment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Return Code</span>
                    <span className="font-medium">{returnShipment.return_code}</span>
                  </div>
                  {returnShipment.fez_tracking ? (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking</span>
                      <span className="font-medium">{returnShipment.fez_tracking}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipment Status</span>
                    <span className="font-medium capitalize">{returnShipment.status}</span>
                  </div>
                </div>
              ) : (
                <div className="py-3 border-b">
                  <span className="text-gray-600 block mb-2">Return Shipping</span>
                  <p className="text-gray-900 mb-3">
                    Choose how to send items back to us (pickup or drop-off).
                  </p>
                  <Link
                    href={`/account/orders/${orderId}/return/method`}
                    className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    Select Return Method
                  </Link>
                </div>
              )}
              {existingRequest.requested_amount ? (
                <div className="flex justify-between py-3 border-b">
                  <span className="text-gray-600">Requested Amount</span>
                  <span className="font-medium">
                    {formatPrice(existingRequest.requested_amount || 0, currency)}
                  </span>
                </div>
              ) : null}
              {existingRequest.line_items?.length ? (
                <div className="py-3 border-b">
                  <span className="text-gray-600 block mb-2">Items</span>
                  <ul className="space-y-2">
                    {existingRequest.line_items.map((item) => (
                      <li key={item.id} className="text-gray-900">
                        <span className="font-medium">{item.name || `#${item.id}`}</span> — qty {item.quantity}
                        {item.refund_total
                          ? ` (${formatPrice(item.refund_total, currency)})`
                          : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="py-3">
                <span className="text-gray-600 block mb-2">Reason</span>
                <p className="text-gray-900">{existingRequest.reason}</p>
              </div>
              {existingRequest.admin_notes && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 font-medium">Notes</p>
                  <p className="text-blue-700 mt-1">{existingRequest.admin_notes}</p>
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/orders/${orderId}`}
            className="block w-full py-3 text-center bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
          >
            Back to Order
          </Link>
        </div>
      </main>
    );
  }

  if (!eligible) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Request Return</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Not Eligible for Return
              </h2>
              <p className="text-gray-600 mb-6">
                Returns are only available after your order is delivered or completed.
              </p>
              <Link
                href={`/orders/${orderId}`}
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

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Request Return</h1>
        </div>

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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Select Items to Return</h2>
          <div className="space-y-4">
            {order.line_items.map((item) => {
              const selectedQty = selectedItems[item.id] || 0;
              const unitPrice = item.quantity ? Number(item.total) / item.quantity : 0;
              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">Ordered qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatPrice(unitPrice, currency)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">Return quantity</label>
                    <input
                      type="number"
                      min={0}
                      max={item.quantity}
                      value={selectedQty}
                      onChange={(e) => {
                        const value = Math.min(
                          Math.max(parseInt(e.target.value, 10) || 0, 0),
                          item.quantity
                        );
                        setSelectedItems((prev) => ({ ...prev, [item.id]: value }));
                      }}
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2"
                    />
                    <span className="text-sm text-gray-700">
                      Refund: {formatPrice(unitPrice * selectedQty, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-700">
            <span>Estimated refund</span>
            <span className="font-semibold">{formatPrice(selectedAmount, currency)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Reason for Return</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select reason</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Details (optional)
              </label>
              <textarea
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                placeholder="Describe the issue"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Return Request'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

