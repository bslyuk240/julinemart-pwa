'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User, Package, MapPin, Heart, Settings, LogOut,
  ChevronRight, ShoppingBag, CreditCard, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getCustomerOrderSummary, getCustomerOrders } from '@/lib/supabase/customers';
import PageLoading from '@/components/ui/page-loading';
import { toast } from 'sonner';

export default function AccountPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading, logout } = useCustomerAuth();
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [orderStats, setOrderStats] = useState({ total: 0, pending: 0, processing: 0, completed: 0 });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showDeferredPanels, setShowDeferredPanels] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (user?.email) loadOrders();
    }
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (isLoading || !customer) return;

    setShowDeferredPanels(false);
    const timer = window.setTimeout(() => setShowDeferredPanels(true), 120);
    return () => window.clearTimeout(timer);
  }, [isLoading, customer?.id]);

  const loadOrders = async () => {
    if (!user?.email) return;
    setOrdersLoading(true);
    try {
      const [summary, orders] = await Promise.all([
        getCustomerOrderSummary(user.email),
        getCustomerOrders(user.email, 3),
      ]);
      setOrderStats(summary);
      setRecentOrders(orders);
    } catch {}
    finally {
      setOrdersLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.push('/');
  };

  const formatPrice = (amount: number | string) =>
    `₦${Number(amount).toLocaleString()}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  if (isLoading) return <PageLoading text="Loading your account..." />;
  if (!customer) return null;

  const accountMenuItems = [
    { icon: Package, title: 'My Orders', description: `${orderStats.total} orders`, href: '/orders', color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { icon: ShoppingBag, title: 'My Returns', description: 'Track returns & refunds', href: '/account/returns', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { icon: MapPin, title: 'Addresses', description: 'Manage shipping & billing', href: '/account/addresses', color: 'text-green-600', bgColor: 'bg-green-50' },
    { icon: Heart, title: 'Wishlist', description: 'Saved items', href: '/wishlist', color: 'text-red-600', bgColor: 'bg-red-50' },
    { icon: CreditCard, title: 'Payment Methods', description: 'Manage your cards', href: '/account/payments', color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { icon: Bell, title: 'Notifications', description: 'Manage preferences', href: '/account/notifications', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { icon: Settings, title: 'Settings', description: 'Account preferences', href: '/account/settings', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg p-6 md:p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {customer.avatar_url ? (
                <img src={customer.avatar_url} alt="Avatar" className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover ring-2 ring-white/30" />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
                  <User className="w-8 h-8 md:w-10 md:h-10" />
                </div>
              )}
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Welcome back, {customer.first_name || 'there'}!
                </h1>
                <p className="text-primary-100 mt-1">{customer.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}
              className="hidden md:flex bg-white/10 border-white/20 text-white hover:bg-white/20">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </div>

        {/* Immediate shell */}
        <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick actions</h2>
              <p className="text-sm text-gray-600">Jump to the parts you use most.</p>
            </div>
            <Link href="/orders" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {accountMenuItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:bg-primary-50/50 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="font-medium text-gray-900 group-hover:text-primary-600">{item.title}</p>
                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        {showDeferredPanels ? (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: orderStats.total, color: 'text-gray-900' },
                  { label: 'Pending', value: orderStats.pending, color: 'text-yellow-600' },
                  { label: 'Processing', value: orderStats.processing, color: 'text-blue-600' },
                  { label: 'Completed', value: orderStats.completed, color: 'text-green-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-lg shadow-sm p-4 min-h-[92px]">
                    <p className="text-sm text-gray-600 mb-1">{s.label}</p>
                    {ordersLoading ? (
                      <div className="h-8 w-16 rounded bg-gray-100 animate-pulse" />
                    ) : (
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                  <Link href="/orders" className="text-primary-600 hover:text-primary-700 text-sm font-medium">View All</Link>
                </div>
                {ordersLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded animate-pulse" />
                          <div className="space-y-2">
                            <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 mb-4">No orders yet</p>
                    <Link href="/"><Button variant="primary" size="sm">Start Shopping</Button></Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order: any) => (
                      <Link key={order.id} href={`/orders/${order.id}`}
                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary-100 rounded flex items-center justify-center">
                            <Package className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Order #{order.order_number}</p>
                            <p className="text-sm text-gray-600">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(order.total_amount)}</p>
                          <p className="text-sm text-gray-600 capitalize">{order.overall_status}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account</h2>
                <div className="space-y-2">
                  {accountMenuItems.map(item => (
                    <Link key={item.href} href={item.href}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group">
                      <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 group-hover:text-primary-600">{item.title}</p>
                        <p className="text-sm text-gray-600 truncate">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
                    </Link>
                  ))}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 transition-colors group mt-4 border-t pt-4">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 group-hover:text-red-600">Logout</p>
                      <p className="text-sm text-gray-600">Sign out of your account</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 flex-shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 min-h-[92px]">
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse mb-3" />
                    <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 rounded animate-pulse" />
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                          <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                        <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 min-h-[320px]">
                <div className="h-6 w-24 bg-gray-100 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-gray-50 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
