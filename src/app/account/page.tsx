'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Shield,
  Package,
  MapPin,
  Heart,
  Settings,
  LogOut,
  ShoppingBag,
  CreditCard,
  Bell,
  ChevronRight,
  Clock,
  RefreshCw,
  CheckCircle2,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getCustomerOrders } from '@/lib/supabase/customers';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';

type AccountOrder = {
  id: string;
  order_number: string | number;
  overall_status: string;
  total_amount: number | string;
  created_at: string;
};

type OrderStats = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
};

const emptyOrderStats: OrderStats = {
  total: 0,
  pending: 0,
  processing: 0,
  completed: 0,
};

function buildOrderStats(orders: AccountOrder[]): OrderStats {
  return orders.reduce<OrderStats>(
    (stats, order) => {
      const status = String(order?.overall_status || '').toLowerCase();

      stats.total += 1;

      if (status === 'pending') {
        stats.pending += 1;
      }

      if (['processing', 'confirmed', 'packed', 'ready-to-ship'].includes(status)) {
        stats.processing += 1;
      }

      if (['delivered', 'completed'].includes(status)) {
        stats.completed += 1;
      }

      return stats;
    },
    { ...emptyOrderStats }
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading, logout, refreshCustomer } = useCustomerAuth();
  const [recentOrders, setRecentOrders] = useState<AccountOrder[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>(emptyOrderStats);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Skip the login redirect during an explicit logout so we land on '/'
        if (!loggingOutRef.current) router.push('/login');
      } else if (user?.email) loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, user]);

  const loadOrders = async () => {
    if (!user?.email) return;

    setOrdersLoading(true);
    try {
      const orders = (await getCustomerOrders(user.email, 1000)) as AccountOrder[];
      setRecentOrders(orders.slice(0, 3));
      setOrderStats(buildOrderStats(orders));
    } catch (error) {
      console.error('Error loading account orders:', error);
      setRecentOrders([]);
      setOrderStats(emptyOrderStats);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    loggingOutRef.current = true;
    await logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const formatPrice = (amount: number | string) =>
    `₦${Number(amount).toLocaleString()}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  if (isLoading) return <PageLoading text="Loading your account..." />;

  if (!customer) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="mx-auto max-w-lg px-4 py-5">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-5 mb-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold leading-tight">Loading your account…</h1>
                <p className="text-primary-100 text-sm mt-0.5 truncate">
                  {user?.email || 'Checking your profile'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
            <h2 className="text-base font-semibold text-gray-900">Account profile is still loading</h2>
            <p className="text-sm text-gray-600 mt-2">
              If this takes too long on your device, retry the profile fetch or sign in again.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" size="sm" onClick={refreshCustomer} fullWidth>Retry</Button>
              <Button variant="outline" size="sm" onClick={handleLogout} fullWidth>Logout</Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const accountMenuItems = [
    {
      icon: Package,
      title: 'My Orders',
      description: `${orderStats.total} ${orderStats.total === 1 ? 'order' : 'orders'}`,
      href: '/orders',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: ShoppingBag,
      title: 'My Returns',
      description: 'Track returns & refunds',
      href: '/account/returns',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Shield,
      title: 'My Purchases',
      description: 'Receipts & warranty',
      href: '/account/purchases',
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    {
      icon: MapPin,
      title: 'Addresses',
      description: 'Manage shipping & billing',
      href: '/account/addresses',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      icon: Store,
      title: 'Following',
      description: 'Stores you follow',
      href: '/account/following',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      icon: Heart,
      title: 'Wishlist',
      description: 'Saved items',
      href: '/account/wishlist',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: CreditCard,
      title: 'Payment Methods',
      description: 'Manage your cards',
      href: '/account/payments',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Manage preferences',
      href: '/account/notifications',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Account preferences',
      href: '/account/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ];

  const statItems = [
    { label: 'Total Orders', value: orderStats.total, icon: ShoppingBag, color: 'text-primary-600', bgColor: 'bg-primary-50' },
    { label: 'Pending', value: orderStats.pending, icon: Clock, color: 'text-orange-500', bgColor: 'bg-orange-50' },
    { label: 'Processing', value: orderStats.processing, icon: RefreshCw, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { label: 'Completed', value: orderStats.completed, icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-50' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom py-5 md:py-8 space-y-5 md:space-y-6">
        {/* Welcome card */}
        <section className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-2xl shadow-lg p-5 md:p-7 text-white">
          <div className="flex items-center gap-4 md:gap-5">
            {customer.avatar_url ? (
              <img
                src={customer.avatar_url}
                alt="Avatar"
                className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-white/40 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 md:w-10 md:h-10" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-base md:text-xl font-bold leading-tight">
                Welcome back, {customer.first_name || 'there'}!
              </h1>
              <p className="text-primary-100 text-sm md:text-base mt-0.5 truncate">{customer.email}</p>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Logout"
              className="flex-shrink-0 w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors active:scale-95"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Account shortcuts */}
        <section className="bg-white rounded-2xl shadow-sm p-4">
          <div className="mb-3">
            <h2 className="text-sm md:text-base font-bold text-gray-900">Account shortcuts</h2>
            <p className="text-xs text-gray-500 mt-0.5">One place for each account function.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {accountMenuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 rounded-xl border border-gray-200 p-3 hover:border-primary-300 active:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 text-xs md:text-sm leading-tight">{item.title}</p>
                  <p className="hidden md:block text-xs text-gray-500 mt-0.5 leading-snug truncate">{item.description}</p>
                </div>
                <ChevronRight className="hidden md:block w-4 h-4 text-gray-300 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statItems.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl ${s.bgColor} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 leading-tight">{s.label}</p>
                {ordersLoading ? (
                  <div className="h-7 w-10 rounded bg-gray-100 animate-pulse mt-1" />
                ) : (
                  <p className={`text-lg md:text-xl font-bold ${s.color}`}>{s.value}</p>
                )}
              </div>
            </div>
          ))}
        </section>

        {/* Recent Orders */}
        <section className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm md:text-base font-bold text-gray-900">Recent Orders</h2>
            <Link href="/orders" className="text-xs md:text-sm font-semibold text-primary-600 flex items-center gap-0.5">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-100 rounded-xl animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-3.5 w-32 bg-gray-100 rounded animate-pulse" />
                      <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2 text-right">
                    <div className="h-3.5 w-16 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-12 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xs md:text-sm mb-4">No orders yet</p>
              <Link href="/">
                <Button variant="primary" size="sm">Start Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-primary-300 active:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-xs md:text-sm truncate">Order #{order.order_number}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="font-semibold text-gray-900 text-xs md:text-sm">{formatPrice(order.total_amount)}</p>
                    <p className="text-xs text-gray-500 capitalize mt-0.5">{order.overall_status}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
