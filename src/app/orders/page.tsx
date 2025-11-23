'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Calendar, ArrowRight, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getCustomerOrders } from '@/lib/woocommerce/orders';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';
import type { Order } from '@/types/order';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Payment statuses
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  
  // Processing statuses
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'ready-to-ship': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  
  // Shipping statuses
  shipped: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'out-for-delivery': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  
  // Completion statuses
  delivered: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  
  // Issue statuses
  'on-hold': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  refunded: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const statusLabels: Record<string, string> = {
  // Payment statuses
  pending: 'Pending Payment',
  
  // Processing statuses
  processing: 'Processing',
  'ready-to-ship': 'Ready to Ship',
  
  // Shipping statuses
  shipped: 'Shipped',
  'out-for-delivery': 'Out for Delivery',
  
  // Completion statuses
  delivered: 'Delivered',
  completed: 'Completed',
  
  // Issue statuses
  'on-hold': 'On Hold',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  failed: 'Failed',
};

export default function OrdersPage() {
  const router = useRouter();
  const { customerId, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/orders');
      } else {
        loadOrders();
      }
    }
  }, [authLoading, isAuthenticated, customerId]);

  const loadOrders = async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const orderList = await getCustomerOrders(customerId);
      setOrders(orderList ?? []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string, currency: string = 'NGN') => {
    const amount = parseFloat(price);
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

  if (authLoading || loading) {
    return <PageLoading text="Loading your orders..." />;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-1">Track your recent purchases and order history.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-600 mb-6">
              You haven&apos;t placed any orders. Start shopping to see them here.
            </p>
            <Link href="/">
              <Button variant="primary">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusStyle = statusColors[order.status] || statusColors.pending;

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center">
                      <Package className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order #{order.number}</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatPrice(order.total, order.currency)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.date_created)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {statusLabels[order.status] || order.status}
                    </span>
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        View Details
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}