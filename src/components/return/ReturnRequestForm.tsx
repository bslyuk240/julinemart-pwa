'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Package, AlertCircle, Loader2, Truck, MapPin, Image, Info } from 'lucide-react';
import { Order } from '@/types/order';
import { formatPrice } from '@/lib/utils/format-price';
import {
  JloReturn,
  JloReturnShipment,
  formatJloRefundStatus,
  formatJloReturnStatus,
  buildFezTrackingUrl,
} from '@/lib/jlo/returns';
import { useCustomerAuth } from '@/context/customer-auth-context';

interface ReturnRequestFormProps {
  orderId: number;
}

const RETURN_REASONS = [
  { value: 'wrong_item', label: 'Wrong item delivered' },
  { value: 'damaged', label: 'Item damaged' },
  { value: 'not_as_described', label: 'Not as described' },
  { value: 'other', label: 'Other (add details)' },
];

type Resolution = 'refund' | 'replacement';
const JLO_RETURNS_URL = 'https://jlo.julinemart.com/api/returns-create';

function canOrderBeReturned(status: string) {
  const eligible = ['delivered', 'completed'];
  return eligible.includes(status);
}

function latestReturn(returns: JloReturn[]): JloReturn | null {
  if (!returns?.length) return null;
  return [...returns].sort((a, b) => {
    const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bDate - aDate;
  })[0];
}

export default function ReturnRequestForm({ orderId }: ReturnRequestFormProps) {
  const router = useRouter();
  const { customer } = useCustomerAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [preferredResolution, setPreferredResolution] = useState<Resolution>('refund');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonNote, setReasonNote] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [method, setMethod] = useState<'pickup' | 'dropoff'>('pickup');

  const currency = order?.currency || 'NGN';
  const activeReturn = useMemo(() => latestReturn(returns), [returns]);
  const selectedAmount =
    order?.line_items?.reduce((sum, item) => {
      const qty = selectedItems[item.id] || 0;
      const unitTotal = item.quantity ? Number(item.total) / item.quantity : 0;
      return sum + unitTotal * qty;
    }, 0) || 0;

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const data = await res.json();
      if (!data.order) {
        toast.error('Order not found');
        router.push('/orders');
        return;
      }
      setOrder(data.order);
      setReturns(Array.isArray(data.returns) ? data.returns : []);
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

    if (!reasonCode) {
      toast.error('Select a reason for your return');
      return;
    }

    if (reasonCode === 'other' && !reasonNote.trim()) {
      toast.error('Add details for your return');
      return;
    }

    try {
      setSubmitting(true);
      const urlImages = imageUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);
      const images = [...urlImages, ...uploadedImages];

      const lineItems = (order.line_items || [])
        .map((item) => {
          const qty = selectedItems[item.id] || 0;
          if (!qty) return null;
          return {
            wc_order_item_id: item.id,
            product_id: item.product_id,
            variation_id: item.variation_id,
            qty,
            unit_price: item.price,
            name: item.name,
          };
        })
        .filter(Boolean) as {
        wc_order_item_id: number;
        product_id: number;
        variation_id: number;
        qty: number;
        unit_price: number;
        name: string;
      }[];

      if (!lineItems.length) {
        toast.error('Select at least one item to return');
        return;
      }

      const response = await fetch(JLO_RETURNS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          wc_customer_id: order.customer_id || customer?.id,
          customer_email: order.billing?.email || '',
          customer_name: `${order.billing?.first_name || ''} ${order.billing?.last_name || ''}`.trim() || undefined,
          line_items: lineItems,
          preferred_resolution: preferredResolution,
          reason_code: reasonCode,
          reason_note: reasonNote,
          images,
          method,
          customer: {
            name: `${order.shipping?.first_name || order.billing?.first_name || ''} ${order.shipping?.last_name || order.billing?.last_name || ''}`.trim(),
            phone: order.billing?.phone,
            address: order.shipping?.address_1 || order.billing?.address_1,
            city: order.shipping?.city || order.billing?.city,
            state: order.shipping?.state || order.billing?.state,
          },
          hub:
            method === 'pickup'
              ? {
                  name: 'JulineMart Returns',
                  phone: order.billing?.phone,
                  address: order.billing?.address_1 || order.shipping?.address_1,
                  city: order.billing?.city || order.shipping?.city,
                  state: order.billing?.state || order.shipping?.state,
                }
              : undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || result?.error || 'Failed to submit return request');
      }

      const payload = result?.data ?? result;
      const createdReturn: JloReturn | null =
        payload?.return_request ||
        payload?.return ||
        (payload?.return_id || payload?.id ? payload : null);

      toast.success('Return request submitted. We will update you soon.');
      if (createdReturn) {
        setReturns((prev) => [createdReturn, ...prev]);
      } else {
        await fetchOrder();
      }
    } catch (error: any) {
      console.error('Error submitting return:', error);
      toast.error(error?.message || 'Failed to submit return request');
    } finally {
      setSubmitting(false);
    }
  };

  const toBase64 = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
    });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const maxFiles = 5;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 8 * 1024 * 1024; // 8MB

    const selectedFiles = Array.from(files).slice(0, maxFiles);
    const validationErrors = selectedFiles
      .map((file) => {
        if (!allowedTypes.includes(file.type)) {
          return `${file.name}: unsupported type`;
        }
        if (file.size > maxSizeBytes) {
          return `${file.name}: exceeds 8MB`;
        }
        return null;
      })
      .filter(Boolean) as string[];

    if (validationErrors.length) {
      toast.error(`Image upload issue: ${validationErrors.join(', ')}`);
      return;
    }

    try {
      const readFiles = await Promise.all(selectedFiles.map((file) => toBase64(file)));
      setUploadedImages((prev) => {
        const next = [...prev, ...readFiles].slice(0, maxFiles);
        return next;
      });
    } catch (err) {
      console.error('Error reading images', err);
      toast.error('Could not load one or more images. Please try again.');
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const renderShipment = (shipment: JloReturnShipment | undefined) => {
    if (!shipment) return null;
    const trackingUrl = shipment.tracking_url || buildFezTrackingUrl(shipment.fez_tracking);
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-1">
        <div className="flex items-center gap-2 text-blue-900 font-semibold">
          {shipment.method === 'pickup' ? <Truck className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
          <span className="capitalize">{shipment.method || 'Return shipment'}</span>
        </div>
        {shipment.return_code ? <p className="text-sm text-blue-800">Return Code: {shipment.return_code}</p> : null}
        {shipment.fez_tracking ? <p className="text-sm text-blue-800">Tracking: {shipment.fez_tracking}</p> : null}
        {shipment.status ? <p className="text-sm text-blue-800">Status: {shipment.status}</p> : null}
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-blue-700 underline"
          >
            Track shipment
          </a>
        ) : null}
      </div>
    );
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

  const eligible = canOrderBeReturned(order.status);

  if (activeReturn) {
    const statusDisplay = formatJloReturnStatus(activeReturn.status);
    const shipment = activeReturn.return_shipments?.[0];
    const refundDisplay = formatJloRefundStatus(activeReturn.refund_status || 'none');

    return (
      <main className="min-h-screen bg-gray-50 pb-24">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <Link href={`/orders/${orderId}`} className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Return Status</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-4">
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${statusDisplay.bgColor} ${statusDisplay.color}`}
              >
                {statusDisplay.label}
              </span>
              <span className="text-gray-600 text-sm">
                Requested {activeReturn.created_at ? new Date(activeReturn.created_at).toLocaleString() : ''}
              </span>
            </div>

            <div className="grid gap-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span className="text-gray-600">Order</span>
                <span className="font-semibold">#{order.number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Resolution</span>
                <span className="font-semibold capitalize">
                  {activeReturn.preferred_resolution || 'refund'}
                </span>
              </div>
              {activeReturn.reason_code ? (
                <div className="flex justify-between">
                  <span className="text-gray-600">Reason</span>
                  <span className="font-semibold">{activeReturn.reason_code}</span>
                </div>
              ) : null}
              {activeReturn.reason_note ? (
                <div>
                  <p className="text-gray-600 mb-1">Details</p>
                  <p className="text-gray-900">{activeReturn.reason_note}</p>
                </div>
              ) : null}
            </div>

            {activeReturn.line_items?.length ? (
              <div className="border-t pt-4">
                <p className="font-semibold text-gray-900 mb-2">Items</p>
                <ul className="space-y-2 text-sm text-gray-800">
                  {activeReturn.line_items.map((item) => (
                    <li key={item.wc_order_item_id} className="flex justify-between">
                      <span>{item.name || `Item ${item.wc_order_item_id}`}</span>
                      <span>x{item.qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {shipment ? renderShipment(shipment) : (
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-4 bg-gray-50">
                <Info className="w-5 h-5 text-gray-500 mt-0.5" />
                <div className="text-sm text-gray-700">
                  <p className="font-semibold text-gray-900">Return shipping</p>
                  <p>We will schedule pickup or share drop-off details once the return is accepted.</p>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-900">Refund Status</p>
              <span
                className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${refundDisplay.bgColor} ${refundDisplay.color}`}
              >
                {refundDisplay.label}
              </span>
              {activeReturn.refund_amount ? (
                <p className="text-sm text-emerald-900">
                  Amount: {formatPrice(activeReturn.refund_amount, activeReturn.refund_currency || currency)}
                </p>
              ) : null}
              {activeReturn.refund_completed_at ? (
                <p className="text-xs text-emerald-800">
                  Completed: {new Date(activeReturn.refund_completed_at).toLocaleString()}
                </p>
              ) : null}
            </div>

            <Link
              href={`/orders/${orderId}`}
              className="block w-full text-center py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
            >
              Back to Order
            </Link>
          </div>
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
              <h2 className="text-xl font-bold text-gray-900 mb-2">Not Eligible for Return</h2>
              <p className="text-gray-600 mb-6">
                Returns are available after your order is delivered/completed. We&apos;ll keep you updated.
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
          <h2 className="font-semibold text-gray-900 mb-4">Select items to return</h2>
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
                    <label className="text-sm text-gray-700">Return qty</label>
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
                      Value: {formatPrice(unitPrice * selectedQty, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-between text-sm text-gray-700">
            <span>Estimated value</span>
            <span className="font-semibold">{formatPrice(selectedAmount, currency)}</span>
          </div>
        </div>

        <form className="bg-white rounded-xl shadow-sm p-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Preferred resolution</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(['refund', 'replacement'] as Resolution[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPreferredResolution(option)}
                  className={`border rounded-lg p-3 text-left transition ${
                    preferredResolution === option
                      ? 'border-primary-600 bg-primary-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="font-semibold text-gray-900 capitalize">{option}</p>
                  <p className="text-xs text-gray-600">
                    {option === 'refund'
                      ? 'Refund after inspection'
                      : 'Replacement if stock is available'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Return method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('pickup')}
                className={`border rounded-lg p-3 text-left transition ${
                  method === 'pickup' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-semibold text-gray-900">Pickup</p>
                <p className="text-xs text-gray-600">Fez rider picks up from your address</p>
              </button>
              <button
                type="button"
                onClick={() => setMethod('dropoff')}
                className={`border rounded-lg p-3 text-left transition ${
                  method === 'dropoff' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
              >
                <p className="font-semibold text-gray-900">Dropoff</p>
                <p className="text-xs text-gray-600">Take items to a Fez drop-off point</p>
              </button>
            </div>
            {method === 'pickup' ? (
              <p className="text-xs text-gray-600 mt-2">
                Pickup address: {order.shipping?.address_1 || order.billing?.address_1},{' '}
                {order.shipping?.city || order.billing?.city} {order.shipping?.state || order.billing?.state}
              </p>
            ) : (
              <p className="text-xs text-gray-600 mt-2">
                You&apos;ll get drop-off instructions after submitting.
              </p>
            )}
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Reason for return</h2>
            <div className="space-y-2">
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                required
              >
                <option value="">Select a reason</option>
                {RETURN_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <textarea
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={3}
                placeholder="Add more details (helps us process faster)"
                required={reasonCode === 'other'}
              />
            </div>
          </div>

          <div>
            <h2 className="font-semibold text-gray-900 mb-3">Photos (optional)</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-primary-500 transition">
                <Image className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Upload photos</p>
                  <p className="text-xs text-gray-600">You can add up to 5 images (JPEG, PNG, WEBP, max 8MB each).</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(e.target.files)}
                  className="hidden"
                />
              </label>
              {uploadedImages.length ? (
                <div className="grid grid-cols-3 gap-3">
                  {uploadedImages.map((src, idx) => (
                    <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200">
                      <img src={src} alt={`Uploaded ${idx + 1}`} className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(idx)}
                        className="absolute top-1 right-1 bg-white/80 text-xs px-2 py-1 rounded hover:bg-white"
                        aria-label="Remove image"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex items-start gap-3">
                <Image className="w-5 h-5 text-gray-500 mt-1" />
                <textarea
                  value={imageUrls}
                  onChange={(e) => setImageUrls(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Paste image URLs here (one per line)"
                />
              </div>
            </div>
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
    </main>
  );
}
