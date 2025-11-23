'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MapPin, 
  Plus, 
  Edit2, 
  Trash2, 
  Home,
  Briefcase,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { updateCustomer } from '@/lib/woocommerce/customers';
import PageLoading from '@/components/ui/page-loading';

interface Address {
  id: string;
  type: 'shipping' | 'billing';
  label: string;
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const router = useRouter();
  const { customer, customerId, isAuthenticated, isLoading: authLoading, refreshCustomer } = useCustomerAuth();
  
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Address Form State
  const [formData, setFormData] = useState({
    type: 'shipping' as 'shipping' | 'billing',
    label: 'Home',
    firstName: '',
    lastName: '',
    company: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'NG',
    phone: '',
    email: '',
    isDefault: false,
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/login?redirect=/account/addresses');
      } else {
        loadAddresses();
      }
    }
  }, [authLoading, isAuthenticated, customer]);

  const loadAddresses = async () => {
    if (!customer) return;

    try {
      setPageLoading(true);
      
      const loadedAddresses: Address[] = [];

      // Load shipping address
      if (customer.shipping) {
        loadedAddresses.push({
          id: 'shipping-1',
          type: 'shipping',
          label: 'Primary Shipping',
          firstName: customer.shipping.first_name || '',
          lastName: customer.shipping.last_name || '',
          company: customer.shipping.company || '',
          address1: customer.shipping.address_1 || '',
          address2: customer.shipping.address_2 || '',
          city: customer.shipping.city || '',
          state: customer.shipping.state || '',
          postcode: customer.shipping.postcode || '',
          country: customer.shipping.country || 'NG',
          phone: customer.shipping.phone || '',
          isDefault: true,
        });
      }

      // Load billing address
      if (customer.billing) {
        loadedAddresses.push({
          id: 'billing-1',
          type: 'billing',
          label: 'Primary Billing',
          firstName: customer.billing.first_name || '',
          lastName: customer.billing.last_name || '',
          company: customer.billing.company || '',
          address1: customer.billing.address_1 || '',
          address2: customer.billing.address_2 || '',
          city: customer.billing.city || '',
          state: customer.billing.state || '',
          postcode: customer.billing.postcode || '',
          country: customer.billing.country || 'NG',
          phone: customer.billing.phone || '',
          email: customer.billing.email || '',
          isDefault: true,
        });
      }

      setAddresses(loadedAddresses);
    } catch (error) {
      console.error('Error loading addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setPageLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;

    setLoading(true);
    try {
      const addressData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        company: formData.company,
        address_1: formData.address1,
        address_2: formData.address2,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        phone: formData.phone,
        ...(formData.type === 'billing' && { email: formData.email }),
      };

      const updateData = formData.type === 'shipping' 
        ? { shipping: addressData }
        : { billing: addressData };

      const success = await updateCustomer(customerId, updateData);

      if (success) {
        toast.success(`${formData.type === 'shipping' ? 'Shipping' : 'Billing'} address ${editingAddress ? 'updated' : 'added'} successfully`);
        await refreshCustomer();
        setShowAddressForm(false);
        setEditingAddress(null);
        resetForm();
        loadAddresses();
      } else {
        toast.error('Failed to save address');
      }
    } catch (error) {
      console.error('Address save error:', error);
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      type: address.type,
      label: address.label,
      firstName: address.firstName,
      lastName: address.lastName,
      company: address.company || '',
      address1: address.address1,
      address2: address.address2 || '',
      city: address.city,
      state: address.state,
      postcode: address.postcode,
      country: address.country,
      phone: address.phone || '',
      email: address.email || '',
      isDefault: address.isDefault,
    });
    setShowAddressForm(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'shipping',
      label: 'Home',
      firstName: '',
      lastName: '',
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      postcode: '',
      country: 'NG',
      phone: '',
      email: '',
      isDefault: false,
    });
  };

  if (authLoading || pageLoading) {
    return <PageLoading text="Loading addresses..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/account"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Back to Account</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Addresses</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage your shipping and billing addresses
            </p>
          </div>
          {!showAddressForm && (
            <Button
              variant="primary"
              onClick={() => {
                resetForm();
                setEditingAddress(null);
                setShowAddressForm(true);
              }}
              className="hidden md:flex"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          )}
        </div>

        {/* Add Address Button - Mobile */}
        {!showAddressForm && (
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              resetForm();
              setEditingAddress(null);
              setShowAddressForm(true);
            }}
            className="md:hidden mb-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Address
          </Button>
        )}

        {/* Address Form */}
        {showAddressForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Address Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'shipping' }))}
                    className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      formData.type === 'shipping'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Home className="w-5 h-5" />
                    <span className="font-medium">Shipping</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: 'billing' }))}
                    className={`p-4 border-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                      formData.type === 'billing'
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Briefcase className="w-5 h-5" />
                    <span className="font-medium">Billing</span>
                  </button>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Last Name"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Company (Optional) */}
              <Input
                label="Company (Optional)"
                name="company"
                value={formData.company}
                onChange={handleInputChange}
              />

              {/* Address Lines */}
              <Input
                label="Address Line 1"
                name="address1"
                value={formData.address1}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Address Line 2 (Optional)"
                name="address2"
                value={formData.address2}
                onChange={handleInputChange}
              />

              {/* City, State, Postcode */}
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                />
                <Input
                  label="Postcode"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Phone */}
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                required
              />

              {/* Email (Billing Only) */}
              {formData.type === 'billing' && (
                <Input
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    setShowAddressForm(false);
                    setEditingAddress(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Address List */}
        {!showAddressForm && (
          <div className="space-y-4">
            {addresses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No addresses yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Add your first shipping or billing address
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowAddressForm(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Address
                </Button>
              </div>
            ) : (
              addresses.map((address) => (
                <div
                  key={address.id}
                  className="bg-white rounded-lg shadow-sm p-6 relative"
                >
                  {/* Address Type Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        address.type === 'shipping' 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {address.type === 'shipping' ? (
                          <Home className="w-5 h-5" />
                        ) : (
                          <Briefcase className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {address.label}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {address.type} Address
                        </p>
                      </div>
                    </div>
                    {address.isDefault && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                        <Check className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>

                  {/* Address Details */}
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p className="font-medium text-gray-900">
                      {address.firstName} {address.lastName}
                    </p>
                    {address.company && <p>{address.company}</p>}
                    <p>{address.address1}</p>
                    {address.address2 && <p>{address.address2}</p>}
                    <p>
                      {address.city}, {address.state} {address.postcode}
                    </p>
                    <p>{address.country}</p>
                    {address.phone && <p className="pt-2">Phone: {address.phone}</p>}
                    {address.email && <p>Email: {address.email}</p>}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(address)}
                      className="flex-1"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}