'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Calendar, ArrowRight, ShoppingBag } from 'lucide-react';
import AccountPageHeader from '@/components/account/account-page-header';
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
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  processing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  vendor_dispatched: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'ready-to-ship': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  in_transit: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  shipped: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  out_for_delivery: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'out-for-delivery': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'on-hold': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  refunded: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  failed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const statusLabels: Record<string, string> = {
  pending: 'Pending Payment',
  processing: 'Processing',
  vendor_dispatched: 'Sent to Hub',
  'ready-to-ship': 'Ready to Ship',
  in_transit: 'In Transit',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  'out-for-delivery': 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
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

  const formatPrice = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₦${(isNaN(num) ? 0 : num).toLocaleString()}`;
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
      <div className="container-custom py-5 md:py-6">
        <AccountPageHeader
          title="My Orders"
          subtitle="Track your recent purchases and order history."
          action={(
            <div className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm">
              <Package className="w-3.5 h-3.5 text-primary-600" />
              <span>{totalOrders}</span>
            </div>
          )}
        />

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              You haven&apos;t placed any orders. Start shopping to see them here.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/">
                <Button variant="primary" size="sm">Start Shopping</Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" size="sm">Account</Button>
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
                  className="bg-white rounded-2xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Order #{order.order_number}</p>
                      <p className="text-lg md:text-xl font-semibold text-gray-900">
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
                      className={`px-3 py-1 rounded-full text-xs md:text-sm font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
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
