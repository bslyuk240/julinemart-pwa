'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Truck, Package, MapPin } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useCustomerAuth } from '@/context/customer-auth-context';
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
import { getShippingFee } from '@/lib/shipping/jloShipping';

interface ShippingOption {
  id: string;
  title: string;
  cost: number | null;
  description?: string;
  zoneId: number;
  methodId: string;
}

const DEFAULT_HUB_ID = '75489a58-69bf-4f17-8d21-880e8196e31d';
const DEFAULT_WEIGHT = 0.5;

// Declare Paystack type
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { customer, customerId, isAuthenticated } = useCustomerAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentOrderRef = useRef<any>(null);
  
  // Shipping & Payment
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('');
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [shippingCost, setShippingCost] = useState<number | null>(null);
  const [taxRate, setTaxRate] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  // JLO shipping calculation state
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

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
    country: 'NG',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

    const formatPrice = (price: number) => `NGN ${price.toLocaleString()}`;
  const total = subtotal + (shippingCost || 0) + taxAmount;

  // Load Paystack script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Initialize Paystack payment with inline callbacks
  const initializePaystackPayment = (config: any) => {
    console.log('🔵 Initializing Paystack with config:', { 
      ref: config.reference, 
      email: config.email, 
      amount: config.amount 
    });

    if (typeof window === 'undefined' || !window.PaystackPop) {
      toast.error('Payment system not loaded. Please refresh the page.');
      setIsProcessing(false);
      return;
    }

    try {
      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount,
        ref: config.reference,
        metadata: config.metadata,
        onClose: function() {
          console.log('❌ Payment window closed');
          toast.warning('Payment cancelled');
          setIsProcessing(false);
          currentOrderRef.current = null;
        },
        callback: function(response: any) {
          console.log('✅ Payment callback received:', response);
          handlePaymentSuccess(response);
        },
      });

      console.log('🔵 Opening Paystack iframe...');
      handler.openIframe();
    } catch (error) {
      console.error('❌ Error initializing Paystack:', error);
      toast.error('Failed to open payment window. Please try again.');
      setIsProcessing(false);
    }
  };

  // Separate payment success handler
  const handlePaymentSuccess = async (response: any) => {
    console.log('🔵 Processing payment success...');
    
    // Validate environment variables - using correct variable names
    const wpUrl = process.env.NEXT_PUBLIC_WP_URL;
    const wcKey = process.env.NEXT_PUBLIC_WC_KEY;
    const wcSecret = process.env.NEXT_PUBLIC_WC_SECRET;

    if (!wpUrl || !wcKey || !wcSecret) {
      console.error('❌ Missing environment variables:', {
        wpUrl: wpUrl || 'MISSING',
        wcKey: wcKey ? 'SET' : 'MISSING',
        wcSecret: wcSecret ? 'SET' : 'MISSING',
      });
      toast.error('Configuration error. Please contact support with reference: ' + response.reference);
      if (currentOrderRef.current?.id) {
        clearCart();
        router.push(`/order-success?order=${currentOrderRef.current.id}`);
      }
      return;
    }
    
    try {
      const orderId = currentOrderRef.current?.id;
      
      if (!orderId) {
        throw new Error('Order ID not found');
      }

      console.log('🔵 Updating order:', orderId);
      console.log('🔵 WordPress URL:', wpUrl);

      // Update order status in WooCommerce
      const updateResponse = await fetch(
        `${wpUrl}/wp-json/wc/v3/orders/${orderId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${btoa(`${wcKey}:${wcSecret}`)}`,
          },
          body: JSON.stringify({
            set_paid: true,
            transaction_id: response.reference,
            status: 'processing',
          }),
        }
      );

      if (updateResponse.ok) {
        console.log('✅ Order updated successfully');
        clearCart();
        toast.success('Payment successful!');
        router.push(`/order-success?order=${orderId}`);
      } else {
        const errorData = await updateResponse.json();
        console.error('❌ Order update failed:', errorData);
        throw new Error('Failed to update order');
      }
    } catch (error) {
      console.error('❌ Error in payment success handler:', error);
      toast.error('Payment received but order update failed. Please contact support with reference: ' + response.reference);
      if (currentOrderRef.current?.id) {
        clearCart();
        router.push(`/order-success?order=${currentOrderRef.current.id}`);
      }
    } finally {
      setIsProcessing(false);
      currentOrderRef.current = null;
    }
  };

  // Fetch shipping methods and payment gateways
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);

        const zonesWithMethods = await getAllShippingMethods();
        const options: ShippingOption[] = [];

        zonesWithMethods.forEach(({ zone, methods }) => {
          methods.forEach((method) => {
            const rawCost = method.settings?.cost?.value;
            const parsedCost = rawCost !== undefined && rawCost !== '' ? parseFloat(rawCost) : NaN;
            const cost = isNaN(parsedCost) ? null : parsedCost;
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
        
        if (options.length > 0) {
          setSelectedShipping(options[0].id);
          setShippingCost(options[0].cost ?? null);
        }

        const gateways = await getEnabledPaymentGateways();
        setPaymentGateways(gateways);
        
        if (gateways.length > 0) {
          setSelectedPayment(gateways[0].id);
        }

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

  // Prefill checkout form when customer data is available
  useEffect(() => {
    if (customer) {
      setFormData((prev) => ({
        ...prev,
        firstName: customer.first_name || prev.firstName,
        lastName: customer.last_name || prev.lastName,
        email: customer.email || prev.email,
        phone: customer.billing?.phone || prev.phone,
        address1: customer.billing?.address_1 || prev.address1,
        address2: customer.billing?.address_2 || prev.address2,
        city: customer.billing?.city || prev.city,
        state: customer.billing?.state || prev.state,
        postcode: customer.billing?.postcode || prev.postcode,
        country: customer.billing?.country || prev.country,
      }));
    }
  }, [customer]);

  // Update tax amount
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

  // Calculate JLO shipping
  useEffect(() => {
    const doCalc = async () => {
      setShippingError(null);

      if (!items.length) return;
      if (!formData.state || !formData.city) return;

      const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
      if (!selectedOption) return;

      if (selectedOption.methodId !== 'jlo_shipping') return;

      setIsCalculatingShipping(true);

      try {
        const shippingItems = (items as any[]).map((item) => ({
          hubId: item.hubId ?? DEFAULT_HUB_ID,
          quantity: item.quantity,
          weight: item.weight ?? DEFAULT_WEIGHT,
        }));

        const res = await getShippingFee({
          deliveryState: formData.state,
          deliveryCity: formData.city,
          items: shippingItems,
          totalOrderValue: subtotal,
        });

        if (!res.success) {
          setShippingError(res.message ?? 'Unable to calculate shipping.');
          return;
        }

        setShippingCost(res.shipping);
      } catch (err) {
        console.error('Error calculating JLO shipping:', err);
        setShippingError('Error calculating shipping. Please try again.');
      } finally {
        setIsCalculatingShipping(false);
      }
    };

    doCalc();
  }, [selectedShipping, formData.state, formData.city, items, shippingOptions, subtotal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleShippingChange = (optionId: string) => {
    setSelectedShipping(optionId);
    const option = shippingOptions.find(o => o.id === optionId);

    if (option && option.methodId !== 'jlo_shipping') {
      setShippingCost(option.cost ?? null);
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

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

    const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
    if (selectedOption && selectedOption.methodId === 'jlo_shipping' && shippingCost === null) {
      toast.error('Please wait for shipping to be calculated.');
      return;
    }

    setIsProcessing(true);

    try {
      const orderData = {
        customer_id: isAuthenticated && customerId ? customerId : undefined,
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
        line_items: items.map((item: any) => ({
          product_id: item.productId,
          quantity: item.quantity,
          variation_id: item.variation?.id || 0,
          meta_data: [
            {
              key: '_hub_id',
              value: item.hubId || DEFAULT_HUB_ID,
            },
            {
              key: '_hub_name',
              value: item.hubName || 'Default Hub',
            }
          ],
        })),
        shipping_lines: selectedShipping ? [{
          method_id: selectedOption?.methodId || 'flat_rate',
          method_title: selectedOption?.title || 'Shipping',
          total: (shippingCost ?? 0).toString(),
        }] : [],
        customer_note: formData.notes,
      };

      console.log('🔵 Creating order...');
      const order = await createOrder(orderData);

      if (order && order.id) {
        console.log('✅ Order created:', order.id);
        
        // Check if payment method requires online payment
        const selectedGateway = paymentGateways.find(g => g.id === selectedPayment);
        const requiresPayment = selectedGateway?.id !== 'cod' && 
                               selectedGateway?.id !== 'bacs' && 
                               selectedGateway?.id !== 'cheque';

        if (requiresPayment) {
          // Store order in ref
          currentOrderRef.current = order;
          
          // Build Paystack config
          const paystackConfig = {
            reference: `JLM_${order.id}_${Date.now()}`,
            email: formData.email,
            amount: Math.round(total * 100), // Convert to kobo
            publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
            metadata: {
              custom_fields: [
                { 
                  display_name: 'Order ID', 
                  variable_name: 'order_id', 
                  value: order.id.toString() 
                },
                { 
                  display_name: 'Customer Name', 
                  variable_name: 'customer_name', 
                  value: `${formData.firstName} ${formData.lastName}` 
                },
              ],
            },
          };

          toast.success('Opening payment window...');
          
          // Small delay to ensure toast shows
          setTimeout(() => {
            initializePaystackPayment(paystackConfig);
          }, 500);
          
        } else {
          // For Cash on Delivery and other offline methods
          clearCart();
          toast.success('Order placed successfully!');
          router.push(`/order-success?order=${order.id}`);
          setIsProcessing(false);
        }
      } else {
        throw new Error('Failed to create order');
      }
    } catch (error: any) {
      console.error('❌ Order creation error:', error);
      toast.error(error.message || 'Failed to place order. Please try again.');
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

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping);

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
                  {shippingOptions.map((option) => {
                    const isJlo = option.methodId === 'jlo_shipping';
                    const displayCost = isJlo ? shippingCost : option.cost;

                    return (
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
                              {displayCost !== null
                                ? (displayCost === 0
                                  ? 'FREE'
                                  : formatPrice(displayCost))
                                : 'Calculated at checkout'}
                            </p>
                          </div>
                          {option.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {option.description.replace(/<[^>]*>/g, '')}
                            </p>
                          )}
                          {isJlo && (
                            <p className="text-xs text-gray-500 mt-1">
                              Shipping is calculated automatically based on your state and city.
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {isCalculatingShipping && (
                  <p className="text-sm text-gray-500 mt-2">
                    Calculating shipping...
                  </p>
                )}
                {shippingError && (
                  <p className="text-sm text-red-600 mt-2">
                    {shippingError}
                  </p>
                )}
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
                {items.map((item: any) => (
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
                  <span className="font-medium">
                    {shippingCost !== null
                      ? (shippingCost === 0 ? 'FREE' : formatPrice(shippingCost))
                      : selectedOption?.methodId === 'jlo_shipping'
                        ? 'Enter state & city'
                        : 'Calculated at checkout'}
                  </span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax ({taxRate}%)</span>
                    <span className="font-medium">{formatPrice(taxAmount)}</span>
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
                disabled={isProcessing}
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

