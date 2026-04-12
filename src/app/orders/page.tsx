'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Calendar, ArrowRight, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getCustomerOrders } from '@/lib/supabase/customers';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';

interface OrderSummary {
  id: string;
  order_number: string | number;
  overall_status: string;
  total_amount: number | string;
  created_at: string;
}

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
  const { user, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const totalOrders = orders.length;

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/orders');
      } else {
        loadOrders();
      }
    }
  }, [authLoading, isAuthenticated, user]);

  const loadOrders = async () => {
    if (!user?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const orderList = await getCustomerOrders(user.email);
      setOrders(orderList ?? []);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number | string, currency: string = 'NGN') => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${(isNaN(num) ? 0 : num).toLocaleString()}`;
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to account
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Orders</h1>
              <p className="text-gray-600 mt-1">Track your recent purchases and order history.</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm">
            <Package className="w-4 h-4 text-primary-600" />
            <span>{totalOrders} {totalOrders === 1 ? 'order' : 'orders'}</span>
          </div>
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
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/">
                <Button variant="primary">Start Shopping</Button>
              </Link>
              <Link
                href="/account"
                className="inline-flex items-center justify-center rounded-lg border-2 border-primary-600 px-4 py-2 font-medium text-primary-600 hover:bg-primary-50 transition-colors"
              >
                Back to account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusStyle = statusColors[order.overall_status] || statusColors.pending;

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
                      <p className="text-sm text-gray-600">Order #{order.order_number}</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatPrice(order.total_amount)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
                    >
                      {statusLabels[order.overall_status] || order.overall_status}
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
