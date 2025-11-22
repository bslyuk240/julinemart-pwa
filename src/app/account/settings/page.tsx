'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Phone, Lock, Bell, Globe, Shield, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import {
  updateCustomer,
  updateCustomerNotificationPreferences,
  updateCustomerAppPreferences,
  getCustomerNotificationPreferences,
  getCustomerAppPreferences,
  deleteCustomer,
} from '@/lib/woocommerce/customers';
import PageLoading from '@/components/ui/page-loading';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { customer, customerId, isAuthenticated, isLoading: authLoading, refreshCustomer, logout } = useCustomerAuth();
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');

  // Profile Form State
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  // Security Form State
  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newsletter: false,
    sms: true,
    push: true,
  });

  // App Preferences
  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: 'NGN',
    theme: 'light',
  });

  // Load customer data
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setPageLoading(false);
        // Redirect to login if not authenticated
        router.push('/login?redirect=/account/settings');
      } else {
        loadCustomerData();
      }
    }
  }, [authLoading, isAuthenticated, customer]);

  const loadCustomerData = async () => {
    if (!customer || !customerId) return;

    try {
      setPageLoading(true);

      // Load profile data
      setProfileData({
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        email: customer.email || '',
        phone: customer.billing?.phone || '',
        dateOfBirth: customer.meta_data.find(m => m.key === 'date_of_birth')?.value || '',
      });

      // Load notification preferences
      const notifPrefs = await getCustomerNotificationPreferences(customerId);
      if (notifPrefs) {
        setNotifications(notifPrefs);
      }

      // Load app preferences
      const appPrefs = await getCustomerAppPreferences(customerId);
      if (appPrefs) {
        setPreferences(appPrefs);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
      toast.error('Failed to load settings');
    } finally {
      setPageLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    if (!customerId) return;

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
        meta_data: [
          {
            key: 'date_of_birth',
            value: profileData.dateOfBirth,
          },
        ],
      });

      if (updated) {
        await refreshCustomer();
        toast.success('Profile updated successfully!');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (securityData.newPassword !== securityData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (securityData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!securityData.currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    setLoading(true);
    try {
      // Note: WooCommerce REST API doesn't support password changes directly
      // You'll need to implement this via WordPress REST API or custom endpoint
      toast.warning('Password change requires WordPress authentication API. Please implement custom endpoint.');
      
      // For demo purposes:
      // const response = await fetch('/api/change-password', {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     customerId,
      //     currentPassword: securityData.currentPassword,
      //     newPassword: securityData.newPassword,
      //   }),
      // });
      
      setSecurityData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password change error:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const success = await updateCustomerNotificationPreferences(customerId, notifications);
      
      if (success) {
        toast.success('Notification preferences updated!');
      } else {
        toast.error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Notification update error:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferencesUpdate = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      const success = await updateCustomerAppPreferences(customerId, preferences);
      
      if (success) {
        toast.success('Preferences updated!');
      } else {
        toast.error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Preferences update error:', error);
      toast.error('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!customerId) return;

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmText !== 'DELETE') {
      toast.error('Account deletion cancelled');
      return;
    }

    setLoading(true);
    try {
      const success = await deleteCustomer(customerId);
      
      if (success) {
        toast.success('Account deleted successfully');
        logout();
        router.push('/');
      } else {
        toast.error('Failed to delete account');
      }
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || pageLoading) {
    return <PageLoading text="Loading settings..." />;
  }

  if (!isAuthenticated) {
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

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'preferences', name: 'Preferences', icon: Globe },
  ];

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/account"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Back to Account</span>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your account settings and preferences
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Customer Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {customer?.first_name} {customer?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{customer?.email}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                Customer ID: #{customerId}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <User className="w-6 h-6 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
                      <p className="text-sm text-gray-600">Update your personal information</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Input
                        label="First Name"
                        value={profileData.firstName}
                        onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                        fullWidth
                      />
                      <Input
                        label="Last Name"
                        value={profileData.lastName}
                        onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                        fullWidth
                      />
                    </div>

                    <Input
                      label="Email Address"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      startIcon={<Mail className="w-5 h-5" />}
                      fullWidth
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      startIcon={<Phone className="w-5 h-5" />}
                      fullWidth
                    />

                    <Input
                      label="Date of Birth (Optional)"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                      fullWidth
                    />

                    <div className="flex justify-end pt-4">
                      <Button
                        variant="primary"
                        onClick={handleProfileUpdate}
                        isLoading={loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Lock className="w-6 h-6 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Security Settings</h2>
                      <p className="text-sm text-gray-600">Manage your password and security</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Password changes require WordPress authentication. 
                        To implement this feature, you'll need to create a custom WordPress REST API endpoint 
                        or use a plugin like JWT Authentication.
                      </p>
                    </div>

                    {/* Change Password */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">Change Password</h3>
                      
                      <Input
                        label="Current Password"
                        type="password"
                        value={securityData.currentPassword}
                        onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                        fullWidth
                      />

                      <Input
                        label="New Password"
                        type="password"
                        value={securityData.newPassword}
                        onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                        helperText="Must be at least 8 characters"
                        fullWidth
                      />

                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={securityData.confirmPassword}
                        onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                        fullWidth
                      />

                      <div className="flex justify-end">
                        <Button
                          variant="primary"
                          onClick={handlePasswordChange}
                          isLoading={loading}
                        >
                          Change Password
                        </Button>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="pt-6 border-t">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                          <p className="text-sm text-gray-600">Add an extra layer of security</p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </div>

                    {/* Delete Account */}
                    <div className="pt-6 border-t">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h3 className="font-semibold text-red-900 mb-1">Danger Zone</h3>
                            <p className="text-sm text-red-700 mb-4">
                              Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleDeleteAccount}
                              disabled={loading}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-6 h-6 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
                      <p className="text-sm text-gray-600">Choose what notifications you receive</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                      
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">Order Updates</p>
                          <p className="text-sm text-gray-600">Get notified about order status changes</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.orderUpdates}
                          onChange={(e) => setNotifications({ ...notifications, orderUpdates: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">Promotions & Deals</p>
                          <p className="text-sm text-gray-600">Receive emails about special offers</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.promotions}
                          onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">Newsletter</p>
                          <p className="text-sm text-gray-600">Weekly newsletter with new products</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.newsletter}
                          onChange={(e) => setNotifications({ ...notifications, newsletter: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                      </label>
                    </div>

                    {/* Other Notifications */}
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-semibold text-gray-900">Other Notifications</h3>
                      
                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">SMS Notifications</p>
                          <p className="text-sm text-gray-600">Receive order updates via SMS</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.sms}
                          onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-gray-900">Push Notifications</p>
                          <p className="text-sm text-gray-600">Get push notifications in the app</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifications.push}
                          onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                          className="w-5 h-5 text-primary-600 rounded"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        variant="primary"
                        onClick={handleNotificationUpdate}
                        isLoading={loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Globe className="w-6 h-6 text-primary-600" />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">App Preferences</h2>
                      <p className="text-sm text-gray-600">Customize your app experience</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Language
                      </label>
                      <select
                        value={preferences.language}
                        onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="yo">Yoruba</option>
                        <option value="ig">Igbo</option>
                        <option value="ha">Hausa</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Currency
                      </label>
                      <select
                        value={preferences.currency}
                        onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="NGN">Nigerian Naira (₦)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>

                    {/* Theme */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Theme
                      </label>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="auto">Auto (System)</option>
                      </select>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        variant="primary"
                        onClick={handlePreferencesUpdate}
                        isLoading={loading}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
