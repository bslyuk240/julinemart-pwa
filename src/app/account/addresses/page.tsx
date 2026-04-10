'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Plus, Edit2, Trash2, Home, Briefcase, Check } from 'lucide-react';
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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link href="/account" className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6">
          <ArrowLeft className="w-5 h-5" /><span>Back to Account</span>
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Addresses</h1>
            <p className="text-sm text-gray-600 mt-1">Manage your shipping and billing addresses</p>
          </div>
          {!showForm && (
            <Button onClick={openNew} variant="primary" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Address
            </Button>
          )}
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">{editingId ? 'Edit Address' : 'New Address'}</h2>
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
            <div className="flex gap-3 mt-6 pt-6 border-t">
              <Button onClick={handleSave} disabled={loading} variant="primary">
                {loading ? 'Saving...' : editingId ? 'Update Address' : 'Save Address'}
              </Button>
              <Button onClick={() => setShowForm(false)} disabled={loading} variant="outline">Cancel</Button>
            </div>
          </div>
        )}

        {/* List */}
        {addresses.length === 0 && !showForm ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No addresses saved</h3>
            <p className="text-gray-600 mb-5">Add an address for faster checkout</p>
            <Button onClick={openNew} variant="primary"><Plus className="w-4 h-4 mr-2" />Add Address</Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.map(a => (
              <div key={a.id} className={`bg-white rounded-xl shadow-sm p-5 border-2 ${a.is_default ? 'border-primary-500' : 'border-transparent'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
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
                  <Button onClick={() => openEdit(a)} variant="outline" size="sm" className="flex items-center gap-1 flex-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button onClick={() => handleDelete(a.id)} variant="outline" size="sm" className="flex items-center gap-1 text-red-600 hover:bg-red-50 flex-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
