'use client';

import Link from 'next/link';
import { User, Package, Heart, MapPin, Settings, LogOut } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';

export default function AccountPage() {
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();

  const accountSections = [
    {
      title: 'Orders',
      description: 'Track, return, or buy things again',
      icon: Package,
      href: '/account/orders',
      badge: 3, // Example: 3 pending orders
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Wishlist',
      description: 'View your saved items',
      icon: Heart,
      href: '/wishlist',
      badge: wishlistCount,
      color: 'bg-red-50 text-red-600',
    },
    {
      title: 'Addresses',
      description: 'Edit addresses for orders',
      icon: MapPin,
      href: '/account/addresses',
      badge: 0,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Account Settings',
      description: 'Manage your account information',
      icon: Settings,
      href: '/account/settings',
      badge: 0,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 md:p-8 mb-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Welcome Back!</h1>
              <p className="text-primary-100">user@example.com</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-3xl font-bold">{itemCount}</p>
              <p className="text-sm text-primary-100">Cart Items</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm text-primary-100">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{wishlistCount}</p>
              <p className="text-sm text-primary-100">Wishlist</p>
            </div>
          </div>
        </div>

        {/* Account Sections */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {accountSections.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.title}
                href={section.href}
                className="bg-white rounded-lg p-6 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  {section.badge > 0 && (
                    <span className="bg-secondary-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {section.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {section.title}
                </h3>
                <p className="text-sm text-gray-600">{section.description}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {/* Example Order */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">Order #12345</span>
                <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                  Delivered
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Delivered on Nov 15, 2024</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900">3 items • ₦450,000</span>
                <Link
                  href="/account/orders/12345"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Details
                </Link>
              </div>
            </div>

            {/* Empty State */}
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No more recent orders</p>
              <Link
                href="/"
                className="inline-block mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Account Actions</h2>
          <div className="space-y-3">
            <Link
              href="/account/settings"
              className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Account Settings</span>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>

            <button className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors w-full text-left">
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-600">Logout</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}