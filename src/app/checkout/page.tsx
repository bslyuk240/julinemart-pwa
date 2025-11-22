'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Truck, Package, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  getAllShippingMethods, 
  getEnabledPaymentGateways,
  ShippingMethod,
  PaymentGateway 
} from '@/lib/woocommerce/shipping';
import { createOrder } from '@/lib/woocommerce/orders';
import { toast } from 'sonner';
import PageLoading from '@/components/ui/page-loading';
import { calculateTax, getDefaultTaxRate } from '@/lib/woocommerce/tax-calculator';

interface ShippingOption {
  id: string;
  title: string;
  cost: number;
  description?: string;
  zoneId: number;
  methodId: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Shipping & Payment
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [shippingCost, setShippingCost] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  // Form Data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postcode: '',
    country: 'NG', // Default to Nigeria
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch shipping methods and payment gateways
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);

        // Fetch shipping methods
        const zonesWithMethods = await getAllShippingMethods();
        const options: ShippingOption[] = [];

        zonesWithMethods.forEach(({ zone, methods }) => {
          methods.forEach((method) => {
            const cost = parseFloat(method.settings?.cost?.value || '0');
            options.push({
              id: `${zone.id}-${method.instance_id}`,
              title: method.title,
              cost: cost,
              description: method.method_description,
              zoneId: zone.id,
              methodId: method.method_id,
            });
          });
        });

        setShippingOptions(options);
        
        // Set first shipping option as default
        if (options.length > 0) {
          setSelectedShipping(options[0].id);
          setShippingCost(options[0].cost);
        }

        // Fetch payment gateways
        const gateways = await getEnabledPaymentGateways();
        setPaymentGateways(gateways);
        
        // Set first payment gateway as default
        if (gateways.length > 0) {
          setSelectedPayment(gateways[0].id);
        }

        // Fetch default tax rate (for display)
        const rate = await getDefaultTaxRate(formData.country);
        setTaxRate(rate * 100);
      } catch (error) {
        console.error('Error fetching checkout data:', error);
        toast.error('Failed to load checkout options');
      } finally {
        setLoading(false);
      }
    };

    if (items.length > 0) {
      fetchCheckoutData();
    } else {
      setLoading(false);
    }
  }, [items]);

  // Update tax amount when totals or location change
  useEffect(() => {
    const updateTaxAmount = async () => {
      if (subtotal <= 0) {
        setTaxAmount(0);
        setTaxRate(0);
        return;
      }
      const taxValue = await calculateTax(
        subtotal,
        'standard',
        formData.country,
        formData.state
      );
      setTaxAmount(taxValue);
      setTaxRate(Number(((taxValue / subtotal) * 100).toFixed(2)));
    };
    updateTaxAmount();
  }, [subtotal, formData.country, formData.state, formData.postcode, formData.city]);

  const total = subtotal + shippingCost + taxAmount;

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleShippingChange = (optionId: string) => {
    setSelectedShipping(optionId);
    const option = shippingOptions.find(o => o.id === optionId);
    if (option) {
      setShippingCost(option.cost);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.address1.trim()) newErrors.address1 = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.state.trim()) newErrors.state = 'State is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Phone validation
    const phoneRegex = /^(\+234|0)[789]\d{9}$/;
    if (formData.phone && !phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Nigerian phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    if (!selectedPayment) {
      toast.error('Please select a payment method');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order data
      const orderData = {
        payment_method: selectedPayment,
        payment_method_title: paymentGateways.find(g => g.id === selectedPayment)?.title || 'Payment',
        set_paid: false,
        billing: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address1,
          address_2: formData.address2,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: formData.country,
          email: formData.email,
          phone: formData.phone,
          company: '',
        },
        shipping: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          address_1: formData.address1,
          address_2: formData.address2,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: formData.country,
          company: '',
        },
        line_items: items.map(item => ({
          product_id: item.productId,
          quantity: item.quantity,
          variation_id: item.variation?.id || 0,
        })),
        shipping_lines: selectedShipping ? [{
          method_id: shippingOptions.find(o => o.id === selectedShipping)?.methodId || 'flat_rate',
          method_title: shippingOptions.find(o => o.id === selectedShipping)?.title || 'Shipping',
          total: shippingCost.toString(),
        }] : [],
        customer_note: formData.notes,
      };

      // Create order via WooCommerce API
      const order = await createOrder(orderData);

      if (order) {
        clearCart();
        toast.success('Order placed successfully!');
        router.push(`/order-success?order=${order.id}`);
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      console.error('Order creation error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <PageLoading text="Loading checkout..." />;
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/cart" className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
              </div>
              
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    error={errors.firstName}
                    fullWidth
                  />
                  <Input
                    label="Last Name *"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    error={errors.lastName}
                    fullWidth
                  />
                </div>

                <Input
                  label="Email Address *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  error={errors.email}
                  fullWidth
                />

                <Input
                  label="Phone Number *"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  error={errors.phone}
                  helperText="Format: +2348012345678 or 08012345678"
                  fullWidth
                />
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-6 h-6 text-primary-600" />
                <h2 className="text-xl font-semibold text-gray-900">Delivery Address</h2>
              </div>
              
              <div className="space-y-4">
                <Input
                  label="Street Address *"
                  name="address1"
                  value={formData.address1}
                  onChange={handleInputChange}
                  error={errors.address1}
                  fullWidth
                />

                <Input
                  label="Apartment, suite, etc. (optional)"
                  name="address2"
                  value={formData.address2}
                  onChange={handleInputChange}
                  fullWidth
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <Input
                    label="City *"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    error={errors.city}
                    fullWidth
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select State</option>
                      <option value="Lagos">Lagos</option>
                      <option value="Abuja">Abuja FCT</option>
                      <option value="Kano">Kano</option>
                      <option value="Rivers">Rivers</option>
                      <option value="Oyo">Oyo</option>
                      <option value="Kaduna">Kaduna</option>
                      <option value="Enugu">Enugu</option>
                      <option value="Delta">Delta</option>
                      <option value="Anambra">Anambra</option>
                      <option value="Edo">Edo</option>
                    </select>
                    {errors.state && (
                      <p className="mt-1.5 text-sm text-red-600">{errors.state}</p>
                    )}
                  </div>
                </div>

                <Input
                  label="Postal Code (optional)"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleInputChange}
                  fullWidth
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Special delivery instructions, etc."
                  />
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            {shippingOptions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Shipping Method</h2>
                </div>

                <div className="space-y-3">
                  {shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedShipping === option.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shipping"
                        value={option.id}
                        checked={selectedShipping === option.id}
                        onChange={(e) => handleShippingChange(e.target.value)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{option.title}</p>
                          <p className="font-semibold text-primary-600">
                            {option.cost === 0 ? 'FREE' : formatPrice(option.cost)}
                          </p>
                        </div>
                        {option.description && (
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Method */}
            {paymentGateways.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                <div className="space-y-3">
                  {paymentGateways.map((gateway) => (
                    <label
                      key={gateway.id}
                      className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedPayment === gateway.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={gateway.id}
                        checked={selectedPayment === gateway.id}
                        onChange={(e) => setSelectedPayment(e.target.value)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{gateway.title}</p>
                        {gateway.description && (
                          <p className="text-sm text-gray-600 mt-1">{gateway.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">
                    {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                    <span className="font-medium">{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">{formatPrice(total)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isProcessing}
                onClick={handlePlaceOrder}
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing your order, you agree to our Terms & Conditions
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
