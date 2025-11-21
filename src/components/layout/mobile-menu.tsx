'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, ChevronRight, User, MapPin, HelpCircle, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const menuItems = [
    { name: 'My Account', href: '/account', icon: User },
    { name: 'Orders', href: '/account/orders', icon: MapPin },
    { name: 'Wishlist', href: '/wishlist', icon: HelpCircle },
    { name: 'Settings', href: '/account/settings', icon: Settings },
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Menu Drawer */}
      <div
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div className="text-white">
              <p className="font-semibold">Welcome!</p>
              <Link href="/login" className="text-sm hover:underline">
                Sign In / Register
              </Link>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-white hover:bg-white/20 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            );
          })}
        </div>

        {/* Categories Section */}
        <div className="border-t border-gray-200 py-4">
          <p className="px-4 text-sm font-semibold text-gray-500 uppercase mb-2">
            Shop by Category
          </p>
          <Link
            href="/category/phones"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <span className="text-gray-900">Phones & Tablets</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/category/electronics"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <span className="text-gray-900">Electronics</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/category/fashion"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <span className="text-gray-900">Fashion</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </Link>
          <Link
            href="/categories"
            onClick={onClose}
            className="flex items-center justify-between px-4 py-3 text-secondary-500 font-medium"
          >
            <span>View All Categories</span>
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-gray-50">
          <button className="flex items-center gap-2 text-red-600 font-medium">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}