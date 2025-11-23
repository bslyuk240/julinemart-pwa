'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, MapPin, CreditCard, Truck } from 'lucide-react';
import { getOrder } from '@/lib/woocommerce/orders';
import { Button } from '@/components/ui/button';
import PageLoading from '@/components/ui/page-loading';
import type { Order as WooOrder } from '@/types/order';

type OrderView = WooOrder & {
  subtotal?: string;
};

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order');
  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const fetchedOrder = await getOrder(parseInt(orderId));
        if (fetchedOrder) {
          const computedSubtotal = (
            parseFloat(fetchedOrder.total || '0') -
            parseFloat(fetchedOrder.shipping_total || '0') -
            parseFloat((fetchedOrder as any).total_tax || '0')
          ).toString();
          setOrder({
            ...fetchedOrder,
            subtotal: (fetchedOrder as any).subtotal ?? computedSubtotal,
          });
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const formatPrice = (price: string) => `NGN ${parseFloat(price).toLocaleString()}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return <PageLoading text="Loading order details..." />;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 md:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-gray-600 text-lg">
              Thank you for your purchase. We've received your order.
            </p>
          </div>

          {/* Order Details Card */}
          {order && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              {/* Order Header */}
              <div className="bg-primary-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-sm mb-1">Order Number</p>
                    <p className="text-2xl font-bold">#{order.number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary-100 text-sm mb-1">Order Date</p>
                    <p className="text-lg font-semibold">{formatDate(order.date_created)}</p>
                  </div>
                </div>
              </div>

              {/* Order Status */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="text-sm text-gray-600">Order Status</p>
                    <p className="text-lg font-semibold text-gray-900 capitalize">
                      {order.status.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-primary-600" />
                  Order Items ({order.line_items.length})
                </h3>
                <div className="space-y-3">
                  {order.line_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {item.image && (
                          <img
                            src={item.image.src}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">{formatPrice(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  Delivery Address
                </h3>
                <div className="text-gray-700">
                  <p className="font-medium">
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

              {/* Payment Info */}
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary-600" />
                  Payment Information
                </h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Payment Method:</span>
                    <span className="font-medium">{order.payment_method_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status:</span>
                    <span className={`font-medium ${order.date_paid ? 'text-green-600' : 'text-yellow-600'}`}>
                      {order.date_paid ? 'Paid' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-6 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">
                      {formatPrice(
                        (parseFloat(order.total) - parseFloat(order.shipping_total) - parseFloat(order.total_tax)).toString()
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping:</span>
                    <span className="font-medium">
                      {order.shipping_lines.length > 0 
                        ? order.shipping_lines[0].method_title 
                        : 'Standard'} - {formatPrice(order.shipping_total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span className="font-medium">{formatPrice(order.total_tax)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary-600">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Order ID */}
          {!orderId && (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Order Found</h2>
              <p className="text-gray-600 mb-6">
                We couldn't find your order details. Please check your email for order confirmation.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/orders">
              <Button variant="primary" size="lg">
                <Package className="w-5 h-5 mr-2" />
                View All Orders
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="lg">
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              What happens next?
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">1.</span>
                <span>You'll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">2.</span>
                <span>We'll process your order and prepare it for shipping</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">3.</span>
                <span>You'll get a tracking number once your order ships</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">4.</span>
                <span>Your order will be delivered to your specified address</span>
              </li>
            </ul>
          </div>

          {/* Contact Support */}
          <div className="mt-6 text-center text-gray-600">
            <p>
              Need help with your order?{' '}
              <Link href="/contact" className="text-primary-600 hover:text-primary-700 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<PageLoading text="Loading order details..." />}>
      <OrderSuccessContent />
    </Suspense>
  );
}


