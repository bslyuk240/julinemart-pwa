'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  X, 
  ChevronRight, 
  User, 
  Package, 
  Heart,
  MapPin, 
  Settings, 
  LogOut,
  LogIn,
  UserPlus,
  ShoppingBag
} from 'lucide-react';
import { clsx } from 'clsx';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { toast } from 'sonner';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  showOnDesktop?: boolean;
}

export default function MobileMenu({ isOpen, onClose, showOnDesktop = false }: MobileMenuProps) {
  const router = useRouter();
  const { customer, isAuthenticated, logout } = useCustomerAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    onClose();
    router.push('/');
  };

  const handleLoginClick = () => {
    onClose();
    router.push('/login');
  };

  const handleRegisterClick = () => {
    onClose();
    router.push('/signup');
  };

  // Authenticated menu items
  const authenticatedMenuItems = [
    { name: 'My Account', href: '/account', icon: User },
    { name: 'Orders', href: '/orders', icon: Package },
    { name: 'Wishlist', href: '/wishlist', icon: Heart },
    { name: 'Addresses', href: '/account/addresses', icon: MapPin },
    { name: 'Settings', href: '/account/settings', icon: Settings },
  ];

  // Guest menu items
  const guestMenuItems = [
    { name: 'Shop All Products', href: '/products', icon: ShoppingBag },
    { name: 'Wishlist', href: '/wishlist', icon: Heart },
  ];

  const menuItems = isAuthenticated ? authenticatedMenuItems : guestMenuItems;

  return (
    <>
      {/* Overlay */}
      <div
        className={clsx(
          'fixed inset-0 bg-black/50 z-50 transition-opacity duration-300',
          showOnDesktop ? '' : 'md:hidden',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Menu Drawer */}
      <div
        className={clsx(
          'fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 transform transition-transform duration-300 ease-in-out shadow-xl flex flex-col',
          showOnDesktop ? '' : 'md:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-600 to-primary-700 flex-shrink-0">
          {isAuthenticated && customer ? (
            // Authenticated User Header
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-white">
                <p className="font-semibold truncate max-w-[150px]">
                  {customer.first_name || 'User'}
                </p>
                <p className="text-xs text-primary-100 truncate max-w-[150px]">
                  {customer.email}
                </p>
              </div>
            </div>
          ) : (
            // Guest User Header
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary-600" />
              </div>
              <div className="text-white">
                <p className="font-semibold">Welcome!</p>
                <p className="text-xs text-primary-100">Guest User</p>
              </div>
            </div>
          )}
          <button onClick={onClose} className="p-1 text-white hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Guest Login/Register Buttons */}
        {!isAuthenticated && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <div className="space-y-2">
              <button
                onClick={handleLoginClick}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                onClick={handleRegisterClick}
                className="w-full flex items-center justify-center gap-2 bg-white text-primary-600 py-2.5 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-primary-600"
              >
                <UserPlus className="w-4 h-4" />
                Create Account
              </button>
            </div>
          </div>
        )}

        {/* Menu Items - Scrollable */}
        <div className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                    <Icon className="w-5 h-5 text-gray-600 group-hover:text-primary-600 transition-colors" />
                  </div>
                  <span className="text-gray-900 font-medium group-hover:text-primary-600 transition-colors">
                    {item.name}
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
            );
          })}
        </div>

        {/* Logout Button and Footer - Fixed at Bottom */}
        <div className="flex-shrink-0 border-t border-gray-200">
          {/* Logout Button (Only for authenticated users) */}
          {isAuthenticated && (
            <div className="px-4 py-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-red-600 font-medium">Logout</span>
              </button>
            </div>
          )}

          {/* Footer Info */}
          <div className="p-4 bg-gray-50">
            <div className="text-center text-xs text-gray-600">
              <p className="mb-1">JulineMart</p>
              <p>Your trusted marketplace</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
