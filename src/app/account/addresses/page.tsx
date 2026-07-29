'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Plus, Edit2, Trash2, Home, Briefcase, Check } from 'lucide-react';
import AccountPageHeader from '@/components/account/account-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { getAddresses, upsertAddress, deleteAddress } from '@/lib/supabase/customers';
import type { CustomerAddress } from '@/types/customer';
import PageLoading from '@/components/ui/page-loading';

const EMPTY_FORM = {
  type: 'shipping' as 'shipping' | 'billing',
  label: 'Home',
  firstName: '', lastName: '', company: '',
  address1: '', address2: '',
  city: '', state: '', postcode: '', country: 'NG',
  phone: '', email: '',
  isDefault: false,
};

export default function AddressesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useCustomerAuth();

  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) { router.push('/login?redirect=/account/addresses'); return; }
      loadAddresses();
    }
  }, [authLoading, isAuthenticated]);

  const loadAddresses = async () => {
    if (!user) return;
    setPageLoading(true);
    try {
      const data = await getAddresses(user.id);
      setAddresses(data);
    } catch { toast.error('Failed to load addresses'); }
    finally { setPageLoading(false); }
  };

  const openNew = () => { setFormData(EMPTY_FORM); setEditingId(null); setShowForm(true); };
  const openEdit = (a: CustomerAddress) => {
    setFormData({
      type: a.type, label: a.label || 'Home',
      firstName: a.first_name || '', lastName: a.last_name || '',
      company: a.company || '', address1: a.address_1 || '',
      address2: a.address_2 || '', city: a.city || '',
      state: a.state || '', postcode: a.postcode || '',
      country: a.country || 'NG', phone: a.phone || '',
      email: a.email || '', isDefault: a.is_default,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.firstName || !formData.address1 || !formData.city || !formData.state) {
      toast.error('Please fill in the required fields');
      return;
    }
    setLoading(true);
    try {
      await upsertAddress(user.id, {
        type: formData.type,
        label: formData.label,
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: formData.company || null,
        address_1: formData.address1,
        address_2: formData.address2 || null,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode || null,
        country: formData.country,
        phone: formData.phone || null,
        email: formData.email || null,
        is_default: formData.isDefault,
      }, editingId || undefined);
      toast.success(editingId ? 'Address updated!' : 'Address added!');
      setShowForm(false);
      await loadAddresses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    setLoading(true);
    try {
      await deleteAddress(id);
      toast.success('Address deleted');
      await loadAddresses();
    } catch { toast.error('Failed to delete address'); }
    finally { setLoading(false); }
  };

  const field = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormData(p => ({ ...p, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  if (authLoading || pageLoading) return <PageLoading text="Loading addresses..." />;

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 md:py-6 max-w-4xl">
        <AccountPageHeader
          title="My Addresses"
          subtitle="Manage your shipping and billing addresses"
          action={!showForm ? (
            <button
              type="button"
              onClick={openNew}
              aria-label="Add address"
              className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center hover:bg-primary-700 transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : undefined}
        />

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-4">{editingId ? 'Edit Address' : 'New Address'}</h2>
            <div className="space-y-4">
              {/* Type + Label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Type</label>
                  <select value={formData.type} onChange={field('type')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="shipping">Shipping</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <select value={formData.label} onChange={field('label')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="First Name *" type="text" value={formData.firstName} onChange={field('firstName')} placeholder="John" fullWidth />
                <Input label="Last Name" type="text" value={formData.lastName} onChange={field('lastName')} placeholder="Doe" fullWidth />
              </div>
              <Input label="Street Address *" type="text" value={formData.address1} onChange={field('address1')} placeholder="123 Main St" fullWidth />
              <Input label="Apartment / Suite" type="text" value={formData.address2} onChange={field('address2')} placeholder="Apt 4B" fullWidth />
              <div className="grid md:grid-cols-3 gap-4">
                <Input label="City *" type="text" value={formData.city} onChange={field('city')} placeholder="Lagos" fullWidth />
                <Input label="State *" type="text" value={formData.state} onChange={field('state')} placeholder="Lagos" fullWidth />
                <Input label="Postcode" type="text" value={formData.postcode} onChange={field('postcode')} placeholder="100001" fullWidth />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Input label="Phone" type="tel" value={formData.phone} onChange={field('phone')} placeholder="08012345678" fullWidth />
                {formData.type === 'billing' && (
                  <Input label="Email" type="email" value={formData.email} onChange={field('email')} placeholder="you@email.com" fullWidth />
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isDefault}
                  onChange={e => setFormData(p => ({ ...p, isDefault: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded" />
                <span className="text-sm text-gray-700">Set as default {formData.type} address</span>
              </label>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5 pt-5 border-t">
              <Button onClick={handleSave} disabled={loading} variant="primary" size="sm" className="sm:flex-1">
                {loading ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <Button onClick={() => setShowForm(false)} disabled={loading} variant="outline" size="sm" className="sm:flex-1">Cancel</Button>
            </div>
          </div>
        )}

        {/* List */}
        {addresses.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-10 text-center">
            <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="text-sm md:text-base font-medium text-gray-900 mb-1">No addresses saved</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">Add an address for faster checkout</p>
            <Button onClick={openNew} variant="primary" size="sm"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Address</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 md:gap-4">
            {addresses.map(a => (
              <div key={a.id} className={`bg-white rounded-2xl shadow-sm p-4 border-2 ${a.is_default ? 'border-primary-500' : 'border-transparent'}`}>
                <div className="flex items-start justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center">
                      {a.label === 'Office' ? <Briefcase className="w-5 h-5 text-primary-600" /> : <Home className="w-5 h-5 text-primary-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{a.label || 'Address'}</p>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">{a.type}</span>
                    </div>
                  </div>
                  {a.is_default && (
                    <span className="flex items-center gap-1 text-xs text-primary-600 font-medium">
                      <Check className="w-3.5 h-3.5" /> Default
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-700 space-y-0.5 mb-4">
                  <p className="font-medium">{a.first_name} {a.last_name}</p>
                  <p>{a.address_1}{a.address_2 ? `, ${a.address_2}` : ''}</p>
                  <p>{a.city}, {a.state}{a.postcode ? ` ${a.postcode}` : ''}</p>
                  {a.phone && <p className="text-gray-500">{a.phone}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(a)}
                    aria-label="Edit address"
                    className="flex-1 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    aria-label="Delete address"
                    className="flex-1 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
