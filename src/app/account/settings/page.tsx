'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Save, Mail, Phone, MapPin, Package, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { updateCustomer, getCustomer } from '@/lib/woocommerce/customers';
import PageLoading from '@/components/ui/page-loading';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { customer, customerId, isAuthenticated, isLoading: authLoading, refreshCustomer } = useCustomerAuth();
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
  });

  // Track if data has changed
  const [hasChanges, setHasChanges] = useState(false);

  // Load customer data
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !customerId) {
        setPageLoading(false);
        router.push('/login?redirect=/account/settings');
      } else {
        loadCustomerData();
      }
    }
  }, [authLoading, isAuthenticated, customerId]);

  // Track changes
  useEffect(() => {
    if (customer) {
      const changed = 
        profileData.firstName !== (customer.first_name || '') ||
        profileData.lastName !== (customer.last_name || '') ||
        profileData.email !== (customer.email || '') ||
        profileData.phone !== (customer.billing?.phone || '');
      
      setHasChanges(changed);
    }
  }, [profileData, customer]);

  const loadCustomerData = async () => {
    if (!customer || !customerId) return;

    try {
      setPageLoading(true);

      // Fetch fresh customer data
      const freshCustomer = await getCustomer(customerId);
      if (!freshCustomer) {
        toast.error('Failed to load customer data');
        return;
      }

      // Load profile data
      setProfileData({
        firstName: freshCustomer.first_name || '',
        lastName: freshCustomer.last_name || '',
        email: freshCustomer.email || '',
        phone: freshCustomer.billing?.phone || '',
        username: freshCustomer.username || '',
      });
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Failed to load settings');
    } finally {
      setPageLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!customerId) return;

    // Validation
    if (!profileData.firstName || !profileData.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    if (!profileData.email) {
      toast.error('Email is required');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const updated = await updateCustomer(customerId, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        email: profileData.email,
        billing: {
          ...customer?.billing,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          email: profileData.email,
          phone: profileData.phone,
        },
        shipping: {
          ...customer?.shipping,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        },
      });

      if (updated) {
        await refreshCustomer();
        toast.success('Profile updated successfully!');
        setHasChanges(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (customer) {
      setProfileData({
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        email: customer.email || '',
        phone: customer.billing?.phone || '',
        username: customer.username || '',
      });
      setHasChanges(false);
    }
  };

  // WooCommerce REST doesn't include orders_count in the typed Customer; pull it defensively.
  const ordersCount = (customer as any)?.orders_count ?? 0;

  if (authLoading || pageLoading) {
    return <PageLoading text="Loading settings..." />;
  }

  if (!isAuthenticated || !customer) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-gray-600 mb-4">Please log in to view your account settings.</p>
          <Link href="/login?redirect=/account/settings">
            <Button variant="primary">Go to Login</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/account"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Account</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 md:px-8 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 md:w-10 md:h-10" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Profile Settings</h1>
                <p className="text-white/90 mt-1 text-sm md:text-base">
                  {customer.first_name} {customer.last_name}
                </p>
                <p className="text-white/70 text-xs md:text-sm mt-1">
                  Member since {new Date(customer.date_created).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Account Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 md:px-8 py-6 bg-gray-50 border-b">
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mx-auto mb-2">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{ordersCount}</p>
              <p className="text-xs text-gray-600">Total Orders</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mx-auto mb-2">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor((Date.now() - new Date(customer.date_created).getTime()) / (1000 * 60 * 60 * 24))}
              </p>
              <p className="text-xs text-gray-600">Days Active</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-full mx-auto mb-2">
                <User className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">#{customerId}</p>
              <p className="text-xs text-gray-600">Customer ID</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full mx-auto mb-2">
                <Mail className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-lg font-bold text-gray-900">
                {customer.billing?.email ? '✓' : '○'}
              </p>
              <p className="text-xs text-gray-600">Email Verified</p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 md:p-8">
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-600 mt-1">Update your personal details and contact information</p>
              </div>

              <div className="space-y-5">
                {/* Username (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={profileData.username}
                    disabled
                    className="bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Username cannot be changed</p>
                </div>

                {/* Name Row */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <Input
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        placeholder="Enter first name"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <Input
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        placeholder="Enter last name"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <Input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="your@email.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Used for order updates and account notifications</p>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <Input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">For delivery and order-related communications</p>
                </div>

                {/* Info Cards */}
                <div className="space-y-3 pt-2">
                  {/* Address Link */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-medium text-blue-900 text-sm">Manage Your Addresses</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Update your billing and shipping addresses for faster checkout
                      </p>
                      <Link 
                        href="/account/addresses"
                        className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Go to Addresses →
                      </Link>
                    </div>
                  </div>

                  {/* Password Info */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div className="flex-1">
                      <h3 className="font-medium text-amber-900 text-sm">Need to Change Your Password?</h3>
                      <p className="text-sm text-amber-700 mt-1">
                        Use the "Forgot Password" link on the login page to reset your password securely
                      </p>
                      <Link 
                        href="/login"
                        className="inline-block mt-2 text-sm font-medium text-amber-600 hover:text-amber-700"
                      >
                        Go to Login Page →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 pt-6 border-t">
                  <Button
                    onClick={handleProfileUpdate}
                    disabled={loading || !hasChanges}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {hasChanges && (
                    <Button
                      onClick={handleCancel}
                      disabled={loading}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {hasChanges && (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    You have unsaved changes
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
