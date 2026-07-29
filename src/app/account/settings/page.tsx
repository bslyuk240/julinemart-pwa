'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Save, Mail, Phone, MapPin, Trash2, Lock } from 'lucide-react';
import AccountPageHeader from '@/components/account/account-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { updateCustomerProfile } from '@/lib/supabase/customers';
import { supabase } from '@/lib/supabase/client';
import PageLoading from '@/components/ui/page-loading';
import { ACCOUNT_DELETION_EMAIL } from '@/lib/constants';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading: authLoading, refreshCustomer } = useCustomerAuth();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({ firstName: '', lastName: '', phone: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', newPass: '', confirm: '' });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login?redirect=/account/settings');
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (customer) {
      setProfileData({
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        phone: customer.phone || '',
      });
    }
  }, [customer]);

  useEffect(() => {
    if (!customer) return;
    const changed =
      profileData.firstName !== (customer.first_name || '') ||
      profileData.lastName !== (customer.last_name || '') ||
      profileData.phone !== (customer.phone || '');
    setHasChanges(changed);
  }, [profileData, customer]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    if (!profileData.firstName || !profileData.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    setLoading(true);
    try {
      await updateCustomerProfile(user.id, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        phone: profileData.phone || null,
      });
      await refreshCustomer();
      toast.success('Profile updated successfully!');
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPass) { toast.error('New password is required'); return; }
    if (passwordData.newPass.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPass)) {
      toast.error('Password must include uppercase, lowercase, and number');
      return;
    }
    if (passwordData.newPass !== passwordData.confirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPass });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setChangingPassword(false);
      setPasswordData({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const daysActive = customer?.created_at
    ? Math.floor((Date.now() - new Date(customer.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  if (authLoading) return <PageLoading text="Loading settings..." />;
  if (!isAuthenticated || !customer) return null;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 md:py-6 max-w-4xl">
        <AccountPageHeader
          title="Profile Settings"
          subtitle="Manage your account details and preferences"
        />

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 md:px-6 py-4 md:py-6 text-white">
            <div className="flex items-center gap-3">
              {customer.avatar_url ? (
                <img src={customer.avatar_url} alt="Avatar"
                  className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-white/30 flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 md:w-8 md:h-8" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-base md:text-lg font-bold leading-tight truncate">{customer.first_name} {customer.last_name}</p>
                <p className="text-white/70 text-xs mt-0.5">
                  Member since {new Date(customer.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 px-4 md:px-6 py-4 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-lg md:text-xl font-bold text-gray-900">{daysActive}</p>
              <p className="text-xs text-gray-600">Days Active</p>
            </div>
            <div className="text-center">
              <p className="text-base md:text-lg font-bold text-gray-900 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-xs text-gray-600">Username</p>
            </div>
            <div className="text-center">
              <p className="text-base md:text-lg font-bold text-gray-900">{user?.email_confirmed_at ? '✓' : '○'}</p>
              <p className="text-xs text-gray-600">Email Verified</p>
            </div>
          </div>

          <div className="p-4 md:p-8">
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Personal Info */}
              <div>
                <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Personal Information</h2>
                <p className="text-sm text-gray-600 mb-5">Update your personal details</p>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <input value={customer.email} disabled
                        className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm cursor-not-allowed" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed here. Contact support if needed.</p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <Input type="text" value={profileData.firstName}
                          onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))}
                          placeholder="First name" className="pl-10" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        <Input type="text" value={profileData.lastName}
                          onChange={e => setProfileData(p => ({ ...p, lastName: e.target.value }))}
                          placeholder="Last name" className="pl-10" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      <Input type="tel" value={profileData.phone}
                        onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+234 800 000 0000" className="pl-10" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5 pt-5 border-t">
                  <Button onClick={handleProfileUpdate} disabled={loading || !hasChanges} variant="primary" size="sm" className="flex items-center gap-1.5 sm:flex-1">
                    <Save className="w-3.5 h-3.5" />{loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  {hasChanges && (
                    <Button onClick={() => setProfileData({ firstName: customer.first_name || '', lastName: customer.last_name || '', phone: customer.phone || '' })}
                      disabled={loading} variant="outline" size="sm" className="sm:flex-1">Cancel</Button>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="border-t pt-8">
                <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-1">Password</h2>
                <p className="text-sm text-gray-600 mb-5">Change your account password</p>
                {!changingPassword ? (
                  <Button onClick={() => setChangingPassword(true)} variant="outline" size="sm" className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Change Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <Input label="New Password" type="password" value={passwordData.newPass}
                      onChange={e => setPasswordData(p => ({ ...p, newPass: e.target.value }))}
                      placeholder="Min. 8 characters" helperText="Must include uppercase, lowercase, and number" fullWidth />
                    <Input label="Confirm New Password" type="password" value={passwordData.confirm}
                      onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Re-enter new password" fullWidth />
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button onClick={handlePasswordChange} disabled={loading} variant="primary" size="sm" className="sm:flex-1">
                        {loading ? 'Updating...' : 'Update Password'}
                      </Button>
                      <Button onClick={() => { setChangingPassword(false); setPasswordData({ current: '', newPass: '', confirm: '' }); }}
                        disabled={loading} variant="outline" size="sm" className="sm:flex-1">Cancel</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="border-t pt-8 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 text-sm">Manage Your Addresses</h3>
                    <p className="text-sm text-blue-700 mt-1">Update billing and shipping addresses for faster checkout</p>
                    <Link href="/account/addresses" className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700">
                      Go to Addresses →
                    </Link>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-red-900 text-sm">Delete Your Account</h3>
                    <p className="text-sm text-red-700 mt-1">
                      To request account deletion, email{' '}
                      <a href={`mailto:${ACCOUNT_DELETION_EMAIL}`} className="font-medium underline">{ACCOUNT_DELETION_EMAIL}</a>
                      {' '}from your registered email.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Link href="/account-deletion"
                        className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">
                        View Deletion Policy
                      </Link>
                      <a href={`mailto:${ACCOUNT_DELETION_EMAIL}`}
                        className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                        Email Request
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
