'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Package, MapPin, CreditCard, Phone, Mail, Share2, Send } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';
import OrderStatusTracker from '@/components/orders/order-status-tracker';
import { JloReturn, formatJloRefundStatus, formatJloReturnStatus, buildFezTrackingUrl } from '@/lib/jlo/returns';
import type { Order as WooOrder } from '@/types/order';

type OrderDetail = WooOrder & {
  subtotal?: string;
  tax_total?: string;
  payment_status?: string;
  _supabase_id?: string;
};

function canOrderBeReturned(status: string) {
  const eligible = ['delivered', 'completed'];
  return eligible.includes(status);
}

// Order can be cancelled if it hasn't been picked up / shipped yet
function canOrderBeCancelled(status: string) {
  const cancellable = ['pending', 'processing', 'confirmed'];
  return cancellable.includes(status);
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { user, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const customerEmail = user?.email ?? null;
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<JloReturn[]>([]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const activeReturn = useMemo(() => {
    if (!returns.length) return null;
    return [...returns].sort((a, b) => {
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    })[0];
  }, [returns]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/orders');
      } else {
        loadOrder();
      }
    }
  }, [authLoading, isAuthenticated, orderId]);

  // Load Paystack inline script so customers can complete payment from here
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error('Failed to fetch order');
      const { order: orderData, returns: jloReturns } = await res.json();
      if (orderData) {
        const taxTotal =
          (orderData as any).tax_total ??
          orderData.total_tax ??
          '0';
        const computedSubtotal = (
          parseFloat(orderData.total || '0') -
          parseFloat(orderData.shipping_total || '0') -
          parseFloat(taxTotal || '0')
        ).toString();

        setOrder({
          ...orderData,
          subtotal: (orderData as any).subtotal ?? computedSubtotal,
          tax_total: taxTotal,
        });
        const payload = jloReturns?.data ?? jloReturns;
        const initialReturns = Array.isArray(payload) ? payload : Array.isArray(payload?.returns) ? payload.returns : [];
        // Fallback: fetch returns by order_id if none came back on the order response
        if (!initialReturns.length) {
          try {
            const fallbackRes = await fetch(`/api/returns?order_id=${orderId}`);
            if (fallbackRes.ok) {
              const fallbackJson = await fallbackRes.json();
              const fbPayload = fallbackJson?.data ?? fallbackJson;
              const fbReturns = Array.isArray(fbPayload) ? fbPayload : Array.isArray(fbPayload?.returns) ? fbPayload.returns : [];
              setReturns(fbReturns);
            } else {
              setReturns([]);
            }
          } catch {
            setReturns(initialReturns);
          }
        } else {
          setReturns(initialReturns);
        }

        // Backup: use customer returns and filter by order_id
        if (!initialReturns.length && customerEmail) {
          try {
            const custRes = await fetch(`/api/returns?customer_email=${encodeURIComponent(customerEmail)}`);
            if (custRes.ok) {
              const custJson = await custRes.json();
              const cpayload = custJson?.data ?? custJson;
              const clist = Array.isArray(cpayload)
                ? cpayload
                : Array.isArray(cpayload?.returns)
                ? cpayload.returns
                : [];
              const filtered = clist.filter((r: any) => String(r.order_id) === String(orderId));
              if (filtered.length) setReturns(filtered);
            }
          } catch {
            /* ignore */
          }
        }
      } else {
        setOrder(null);
      }
    } catch (error) {
      console.error('Error loading order:', error);
      toast.error('Failed to load order details');
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string, currency: string = 'NGN') => {
    const amount = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(amount)) return `${currency} 0`;
    if (currency === 'NGN') {
      return `NGN ${amount.toLocaleString()}`;
    }
    return `${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const returnStatusDisplay = activeReturn ? formatJloReturnStatus(activeReturn.status) : null;
  const refundStatusDisplay = activeReturn
    ? formatJloRefundStatus(activeReturn.refund_status || 'none')
    : null;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Order #${order?.number}`,
          text: `View my order details`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Order link copied to clipboard!');
    }
  };

  const handleEmailInvoice = async () => {
    if (!order) return;
    const email = order.billing?.email;
    if (!email) {
      toast.error('No email address found for this order.');
      return;
    }

    const toastId = toast.loading('Generating invoice...');
    try {
      // Generate the PDF and get it as a base64 string instead of downloading
      const { generateInvoicePDFBase64 } = await import('@/lib/invoice-generator');
      const base64 = await generateInvoicePDFBase64({
        order: {
          ...order,
          subtotal: order.subtotal ?? '0',
          total_tax: order.total_tax ?? order.tax_total ?? '0',
        },
      });

      toast.loading('Sending to your email...', { id: toastId });

      const supabaseId = (order as any)._supabase_id ?? order.id;
      const res = await fetch(`/api/orders/${supabaseId}/email-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_email: email,
          pdf_base64: base64,
          file_name: `Invoice-${order.number}.pdf`,
        }),
      });

      const data = await res.json();
      toast.dismiss(toastId);

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Failed to send invoice. Please try again.');
      } else {
        toast.success(`Invoice sent to ${email}`);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.dismiss(toastId);
      toast.error('Failed to send invoice. Please try again.');
    }
  };

  const verifyCompletedPayment = async (paystackRef: string) => {
    toast.loading('Verifying payment...', { id: 'pay-verify' });
    try {
      const res = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: paystackRef,
          orderId: order?.transaction_id, // JLO payment_reference lookup key
          customerEmail: order?.billing?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Payment verification failed', { id: 'pay-verify' });
        setIsPaying(false);
        return;
      }
      toast.success('Payment successful! Your order is confirmed.', { id: 'pay-verify' });
      setIsPaying(false);
      await loadOrder();
    } catch {
      toast.error('Payment verification failed. Please contact support.', { id: 'pay-verify' });
      setIsPaying(false);
    }
  };

  const handleCompletePayment = () => {
    if (!order) return;
    const w = window as any;
    if (!w.PaystackPop) {
      toast.error('Payment system is still loading. Please try again in a moment.');
      return;
    }
    const email = order.billing?.email;
    const amountKobo = Math.round(parseFloat(order.total || '0') * 100);

    if (!order.transaction_id || !email || amountKobo <= 0) {
      toast.error('Unable to start payment for this order. Please contact support.');
      return;
    }

    // Fresh Paystack reference for the retry — avoids "Duplicate Transaction
    // Reference" if the first attempt left an abandoned transaction. The JLO
    // order is still located via order.transaction_id during verification.
    const reference = `${order.transaction_id}-R${Date.now().toString(36).toUpperCase()}`;

    setIsPaying(true);
    try {
      const handler = w.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email,
        amount: amountKobo,
        ref: reference,
        metadata: {
          order_id: order._supabase_id ?? order.id,
          custom_fields: [
            { display_name: 'Order Number', variable_name: 'order_number', value: `#${order.number}` },
          ],
        },
        onClose: () => {
          setIsPaying(false);
          toast.warning('Payment cancelled. You can complete it anytime from this page.');
        },
        callback: (response: any) => {
          verifyCompletedPayment(response.reference);
        },
      });
      handler.openIframe();
    } catch {
      setIsPaying(false);
      toast.error('Could not open the payment window. Please try again.');
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const supabaseId = (order as any)._supabase_id ?? order.id;
      const res = await fetch(`/api/orders/${supabaseId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Could not cancel this order. Please contact support.');
        return;
      }

      toast.success(data.message || 'Order cancelled successfully.');
      setCancelConfirm(false);
      // Reload order to reflect cancelled status
      await loadOrder();
    } catch {
      toast.error('Failed to cancel order. Please try again or contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  if (authLoading || loading) {
    return <PageLoading text="Loading order details..." />;
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-4">Order not found</h2>
          <Link href="/orders">
            <Button variant="primary" size="sm">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const returnRequestsCount = returns.length;
  const returnEligible = canOrderBeReturned(order.status) && !activeReturn && returnRequestsCount < 2;
  const returnShipment = activeReturn?.return_shipment;
  const cancelEligible = canOrderBeCancelled(order.status);
  const isPaid = order.payment_status === 'paid' || Boolean(order.date_paid);
  const paymentPending = order.status === 'pending' && !isPaid;
  const canCompletePayment = paymentPending && Boolean(order.transaction_id);
  const showReturns = returnEligible || Boolean(activeReturn);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 md:py-6">
        <PageHeader
          title={`Order #${order.number}`}
          subtitle={`Placed on ${formatDate(order.date_created)}`}
          backHref="/orders"
          backLabel="Back to orders"
          action={(
            <button
              type="button"
              onClick={handleShare}
              aria-label="Share order"
              className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95"
            >
              <Share2 className="w-4 h-4 text-gray-600" />
            </button>
          )}
        />

        {/* Complete Payment banner — shown when order is created but unpaid */}
        {paymentPending && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-5 h-5 text-amber-700" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-amber-900 text-sm">Payment not completed</p>
                <p className="text-xs text-amber-700">
                  Pay {formatPrice(order.total, order.currency)} to confirm this order.
                </p>
              </div>
            </div>
            {canCompletePayment ? (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                isLoading={isPaying}
                onClick={handleCompletePayment}
              >
                Complete Payment
              </Button>
            ) : (
              <p className="text-xs text-amber-700">
                Please contact support to complete payment for this order.
              </p>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Dynamic Status Tracker */}
            <OrderStatusTracker
              status={order.status}
              dateCreated={order.date_created}
              datePaid={order.date_paid}
              dateCompleted={order.date_completed}
              metaData={order.meta_data}
            />

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <h2 className="text-base md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.line_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Quantity: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.total, order.currency)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatPrice(item.price.toString(), order.currency)} each
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Order Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(order.subtotal || '0', order.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(order.shipping_total, order.currency)}
                  </span>
                </div>
                {parseFloat(order.total_tax || '0') > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">
                      {formatPrice(order.total_tax || '0', order.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-primary-600 text-lg">
                    {formatPrice(order.total, order.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">Shipping Address</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.shipping.first_name} {order.shipping.last_name}
                </p>
                <p>{order.shipping.address_1}</p>
                {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                <p>
                  {order.shipping.city}, {order.shipping.state}{' '}
                  {order.shipping.postcode}
                </p>
                <p>{order.shipping.country}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  <h3 className="font-semibold text-gray-900">Payment Method</h3>
                </div>
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                    isPaid
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {isPaid ? 'Paid' : 'Awaiting payment'}
                </span>
              </div>
              <p className="text-sm text-gray-600">{order.payment_method_title}</p>
              {order.transaction_id && (
                <p className="text-xs text-gray-500 mt-2 break-all">
                  Transaction ID: {order.transaction_id}
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">Contact Information</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <p>{order.billing.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <p>{order.billing.phone}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 space-y-2.5">
              {canCompletePayment && (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={isPaying}
                  onClick={handleCompletePayment}
                >
                  Complete Payment
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleEmailInvoice}
              >
                <Send className="w-4 h-4 mr-2" />
                Email Invoice
              </Button>

              {showReturns && (
                <Link href={`/account/orders/${order.id}/return`} className="block">
                  <Button variant="secondary" size="sm" fullWidth>
                    {activeReturn ? 'View return request' : 'Request a return'}
                  </Button>
                </Link>
              )}

              {cancelEligible &&
                (cancelConfirm ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2.5">
                    <p className="text-sm font-medium text-red-800">Cancel this order?</p>
                    {isPaid && (
                      <p className="text-xs text-red-700">
                        Your payment will be refunded within 5–10 business days.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        isLoading={isCancelling}
                        onClick={handleCancelOrder}
                        className="!bg-red-600 hover:!bg-red-700"
                      >
                        Yes, cancel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        disabled={isCancelling}
                        onClick={() => setCancelConfirm(false)}
                      >
                        Keep order
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    onClick={() => setCancelConfirm(true)}
                    className="!border-red-300 !text-red-600 hover:!bg-red-50"
                  >
                    Cancel Order
                  </Button>
                ))}

              <Link href="/" className="block pt-1">
                <span className="block w-full text-center text-sm text-gray-500 hover:text-gray-700 py-1">
                  Continue shopping
                </span>
              </Link>
            </div>

            {showReturns && (
            <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Returns &amp; Refunds</h3>
              {activeReturn ? (
                <div className="space-y-3 text-sm text-gray-700">
                  {returnStatusDisplay && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${returnStatusDisplay.bgColor} ${returnStatusDisplay.color}`}
                      >
                        {returnStatusDisplay.label}
                      </span>
                      <span className="text-gray-600">
                        {activeReturn.created_at
                          ? `Requested ${new Date(activeReturn.created_at).toLocaleDateString()}`
                          : ''}
                      </span>
                    </div>
                  )}
                  {returnShipment ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-1">
                      <p className="font-semibold text-blue-900 capitalize">Return shipment</p>
                      {returnShipment.return_code ? (
                        <p className="text-sm text-blue-800">Return Code: {returnShipment.return_code}</p>
                      ) : null}
                      {returnShipment.tracking_number ? (
                        <p className="text-sm text-blue-800">
                          Tracking:{' '}
                          <a
                            href={buildFezTrackingUrl(returnShipment.tracking_number) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-blue-700"
                          >
                            {returnShipment.tracking_number}
                          </a>
                        </p>
                      ) : null}
                      {returnShipment.status ? (
                        <p className="text-sm text-blue-800">Status: {returnShipment.status}</p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Thank you for dropping off your item. we shall process refund once return is confirmed in good condition.
                    </p>
                  )}
                  {refundStatusDisplay ? (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Refund Status</p>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${refundStatusDisplay.bgColor} ${refundStatusDisplay.color}`}
                      >
                        {refundStatusDisplay.label}
                      </span>
                      {activeReturn.refund_amount ? (
                        <p className="text-sm text-gray-700 mt-1">
                          Amount: {formatPrice(activeReturn.refund_amount, activeReturn.refund_currency || order.currency)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Returns are managed by JulineMart Logistics in partnership with Fez Delivery.
                </p>
              )}
            </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
