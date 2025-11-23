'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Calendar, Phone, Mail, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getOrder } from '@/lib/woocommerce/orders';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/lib/invoice-generator';
import type { Order as WooOrder } from '@/types/order';

type OrderDetail = WooOrder & {
  subtotal?: string;
  tax_total?: string;
};

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'on-hold': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  refunded: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const statusLabels: Record<string, string> = {
  pending: 'Pending Payment',
  processing: 'Processing',
  'on-hold': 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  const { customerId, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleDownloadInvoice = () => {
    if (!order) return;
    
    const toastId = toast.loading('Generating invoice...');
    try {
      generateInvoicePDF({
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

  const statusStyle = statusColors[order.status] || statusColors.pending;

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
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Order Status</h2>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                >
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              {/* Order Timeline */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full bg-green-500" />
                    </div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2" />
                  </div>
                  <div className="flex-1 pb-8">
                    <p className="font-medium text-gray-900">Order Placed</p>
                    <p className="text-sm text-gray-600">{formatDate(order.date_created)}</p>
                  </div>
                </div>

                {order.status !== 'pending' && order.status !== 'failed' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        order.status === 'processing' || order.status === 'completed'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                      }`}>
                        <div className={`w-4 h-4 rounded-full ${
                          order.status === 'processing' || order.status === 'completed'
                            ? 'bg-blue-500'
                            : 'bg-gray-300'
                        }`} />
                      </div>
                      {order.status === 'completed' && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <p className="font-medium text-gray-900">Processing</p>
                      <p className="text-sm text-gray-600">
                        {order.status === 'processing' || order.status === 'completed'
                          ? 'Your order is being prepared'
                          : 'Waiting for confirmation'}
                      </p>
                    </div>
                  </div>
                )}

                {order.status === 'completed' && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full bg-green-500" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Completed</p>
                      <p className="text-sm text-gray-600">Order delivered successfully</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                {order.line_items.map((item: any) => (
                  <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                    <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image.src}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      {item.variation_id > 0 && item.meta_data && (
                        <div className="text-sm text-gray-600 mt-1">
                          {item.meta_data
                            .filter((meta: any) => !meta.key.startsWith('_'))
                            .map((meta: any) => (
                              <p key={meta.id}>
                                {meta.display_key}: {meta.display_value}
                              </p>
                            ))}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        Qty: {item.quantity} - {formatPrice(item.price, order.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatPrice(item.total, order.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Note */}
            {order.customer_note && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Notes</h2>
                <p className="text-gray-600">{order.customer_note}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal ?? '0', order.currency)}</span>
                </div>
                {parseFloat(order.shipping_total) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{formatPrice(order.shipping_total, order.currency)}</span>
                  </div>
                )}
                {parseFloat(order.total_tax ?? order.tax_total ?? '0') > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{formatPrice(order.total_tax ?? order.tax_total ?? '0', order.currency)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span className="text-primary-600">{formatPrice(order.total, order.currency)}</span>
              </div>

              {/* Payment Info */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <p className="font-medium text-gray-900">Payment Method</p>
                </div>
                <p className="text-gray-600 text-sm">{order.payment_method_title}</p>
                {order.transaction_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    Transaction ID: {order.transaction_id}
                  </p>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Shipping Address</h3>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-medium text-gray-900">
                  {order.shipping.first_name} {order.shipping.last_name}
                </p>
                <p>{order.shipping.address_1}</p>
                {order.shipping.address_2 && <p>{order.shipping.address_2}</p>}
                <p>
                  {order.shipping.city}, {order.shipping.state} {order.shipping.postcode}
                </p>
                <p>{order.shipping.country}</p>
              </div>
            </div>

            {/* Billing Address */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-gray-400" />
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
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

