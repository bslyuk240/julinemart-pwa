'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CreditCard, Phone, Mail, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getOrder } from '@/lib/woocommerce/orders';
import PageLoading from '@/components/ui/page-loading';
import {
  getRefundPolicy,
  canOrderBeRefunded,
  isOrderEligibleForRefund,
  getRefundRequestStatus,
  formatRefundStatus,
  RefundRequestMeta,
} from '@/lib/woocommerce/refunds';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import OrderStatusTracker from '@/components/orders/order-status-tracker';
import type { Order as WooOrder } from '@/types/order';

type OrderDetail = WooOrder & {
  subtotal?: string;
  tax_total?: string;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { customerId, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refundInfo, setRefundInfo] = useState<{
    eligible: boolean;
    message: string;
    existingRequest?: RefundRequestMeta | null;
  }>({ eligible: false, message: 'Loading refund policy...' });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/orders');
      } else {
        loadOrder();
      }
    }
  }, [authLoading, isAuthenticated, orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const orderData = await getOrder(parseInt(orderId));
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

        // Refund eligibility + status
        try {
          const policy = await getRefundPolicy();
          const timeEligibility = isOrderEligibleForRefund(
            orderData.date_completed || orderData.date_created,
            policy.days
          );
          const statusEligibility = canOrderBeRefunded(orderData.status);
          const existingRequest = await getRefundRequestStatus(orderData.id);

          setRefundInfo({
            eligible: timeEligibility.eligible && statusEligibility && !existingRequest,
            message: existingRequest
              ? `Refund request ${formatRefundStatus(existingRequest.status)}`
              : statusEligibility
              ? timeEligibility.eligible
                ? `Eligible for refund (${timeEligibility.daysRemaining} day(s) remaining)`
                : timeEligibility.reason || 'Outside refund window'
              : `Orders with status "${orderData.status}" cannot be refunded`,
            existingRequest,
          });
        } catch (error) {
          console.error('Error checking refund eligibility:', error);
          setRefundInfo({
            eligible: false,
            message: 'Unable to determine refund eligibility right now.',
          });
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

  const formatPrice = (price: string, currency: string = 'NGN') => {
    const amount = parseFloat(price);
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

  const handleDownloadInvoice = async () => {
    if (!order) return;
    
    const toastId = toast.loading('Generating invoice...');
    try {
      await generateInvoicePDF({
        order: {
          ...order,
          subtotal: order.subtotal ?? '0',
          total_tax: order.total_tax ?? order.tax_total ?? '0',
        },
      });
      toast.dismiss(toastId);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.dismiss(toastId);
      toast.error('Failed to generate invoice. Please try again.');
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h2>
          <Link href="/orders">
            <Button variant="primary">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/orders" className="text-gray-600 hover:text-primary-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Order #{order.number}
              </h1>
              <p className="text-gray-600 mt-1">
                Placed on {formatDate(order.date_created)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dynamic Status Tracker */}
            <OrderStatusTracker
              status={order.status}
              dateCreated={order.date_created}
              datePaid={order.date_paid}
              dateCompleted={order.date_completed}
              metaData={order.meta_data}
            />

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
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
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
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
            <div className="bg-white rounded-lg shadow-sm p-6">
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-gray-900">Payment Method</h3>
              </div>
              <p className="text-sm text-gray-600">{order.payment_method_title}</p>
              {order.transaction_id && (
                <p className="text-xs text-gray-500 mt-2">
                  Transaction ID: {order.transaction_id}
                </p>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
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
            <div className="space-y-2">
              <Button 
                variant="outline" 
                fullWidth
                onClick={handleDownloadInvoice}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
              </Button>
              <Link href="/" className="block">
                <Button variant="primary" fullWidth>
                  Continue Shopping
                </Button>
              </Link>
              <Link href={`/account/orders/${order.id}/refund`} className="block">
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={!refundInfo.eligible}
                >
                  {refundInfo.existingRequest
                    ? 'View refund request'
                    : refundInfo.eligible
                    ? 'Request a refund'
                    : 'Refund unavailable'}
                </Button>
              </Link>
              <p className="text-xs text-gray-500 text-center">
                {refundInfo.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
