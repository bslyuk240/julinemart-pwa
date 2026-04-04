'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Truck, Package, MapPin, Tag } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { 
  getAllShippingMethods, 
  getEnabledPaymentGateways,
  getMatchingShippingZoneData,
  PaymentGateway 
} from '@/lib/woocommerce/shipping';
// Orders are created via server API to avoid client-side CORS
import { toast } from 'sonner';
import PageLoading from '@/components/ui/page-loading';
import { calculateTax, getDefaultTaxRate } from '@/lib/woocommerce/tax-calculator';
import { getShippingFee } from '@/lib/shipping/jloShipping';
import { updateCustomer } from '@/lib/woocommerce/customers';
import { trackBeginCheckout, trackPurchase } from '@/lib/gtag';
import { useCartStore } from '@/store/cart-store';

interface ShippingOption {
  id: string;
  title: string;
  cost: number | null;
  description?: string;
  zoneId: number;
  methodId: string;
}

interface SavedCard {
  id: string;
  authorization_code: string;
  card_type: string;
  last4: string;
  exp_month: string;
  exp_year: string;
  bank: string;
  country_code: string;
  is_default: boolean;
}

const DEFAULT_HUB_ID = '75489a58-69bf-4f17-8d21-880e8196e31d';
const DEFAULT_WEIGHT = 0.5;
const VOUCHER_VALIDATION_URL =
  process.env.NEXT_PUBLIC_VOUCHER_VALIDATION_URL ||
  'https://jlo.julinemart.com/.netlify/functions/voucherHelpers';

// Declare Paystack type
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { customer, customerId, isAuthenticated, refreshCustomer } = useCustomerAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCartHydrated, setIsCartHydrated] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return useCartStore.persist?.hasHydrated?.() ?? true;
  });
  const currentOrderRef = useRef<any>(null);
  const hasTrackedBeginCheckoutRef = useRef(false);
  
  // Saved card state
  const [defaultSavedCard, setDefaultSavedCard] = useState<SavedCard | null>(null);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  
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
  const [useDifferentAddress, setUseDifferentAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  // NEW: Influencer coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [shippingDiscount, setShippingDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);

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

  const applyShippingAddress = useCallback((): void => {
    if (!customer?.shipping) return;

    const shipping = customer.shipping;
    const billing = customer.billing;

    setFormData((prev) => ({
      ...prev,
      firstName: shipping.first_name || customer.first_name || prev.firstName,
      lastName: shipping.last_name || customer.last_name || prev.lastName,
      email: prev.email || customer.email || billing?.email || '',
      phone: shipping.phone || billing?.phone || prev.phone,
      address1: shipping.address_1 || prev.address1,
      address2: shipping.address_2 || prev.address2,
      city: shipping.city || prev.city,
      state: shipping.state || prev.state,
      postcode: shipping.postcode || prev.postcode,
      country: shipping.country || prev.country || 'NG',
    }));
  }, [customer]);

  const applyBillingAddress = useCallback((): void => {
    if (!customer?.billing) return;

    const billing = customer.billing;

    setFormData((prev) => ({
      ...prev,
      firstName: billing.first_name || customer?.first_name || prev.firstName,
      lastName: billing.last_name || customer?.last_name || prev.lastName,
      email: billing.email || customer?.email || prev.email,
      phone: billing.phone || prev.phone,
      address1: billing.address_1 || prev.address1,
      address2: billing.address_2 || prev.address2,
      city: billing.city || prev.city,
      state: billing.state || prev.state,
      postcode: billing.postcode || prev.postcode,
      country: billing.country || prev.country || 'NG',
    }));
  }, [customer]);

  const formatPrice = (price: number) => `NGN ${price.toLocaleString()}`;
  
  // ✅ FIXED: Correct calculation - vouchers discount products, coupons discount shipping
  const activeShippingDiscount = appliedCoupon ? shippingDiscount : 0; // Only influencer coupons discount shipping
  const discountedShipping = Math.max(0, (shippingCost || 0) - activeShippingDiscount);
  const discountedSubtotal = Math.max(0, subtotal - voucherDiscount); // Vouchers discount products
  const total = discountedSubtotal + discountedShipping + taxAmount;

  const toAnalyticsItems = useCallback(
    () =>
      items.map((item: any) => ({
        item_id: String(item.variation?.id ?? item.productId ?? item.id),
        item_name: item.name,
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        item_brand: item.vendorName || undefined,
        item_variant: item.variation?.attributes
          ? Object.entries(item.variation.attributes)
              .map(([key, value]) => `${key}:${String(value)}`)
              .join(', ')
          : undefined,
      })),
    [items]
  );

  const trackPurchaseForOrder = useCallback(
    (orderId: number | string) => {
      trackPurchase({
        transactionId: String(orderId),
        currency: 'NGN',
        value: total,
        shipping: discountedShipping,
        items: toAnalyticsItems(),
      });
    },
    [discountedShipping, toAnalyticsItems, total]
  );

  // Load Paystack script
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.PaystackPop) {
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const persistApi = useCartStore.persist;

    if (!persistApi?.hasHydrated || !persistApi?.onFinishHydration) {
      setIsCartHydrated(true);
      return;
    }

    if (persistApi.hasHydrated()) {
      setIsCartHydrated(true);
      return;
    }

    const unsubscribe = persistApi.onFinishHydration(() => {
      setIsCartHydrated(true);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!items.length || hasTrackedBeginCheckoutRef.current) return;

    trackBeginCheckout({
      currency: 'NGN',
      value: discountedSubtotal,
      items: toAnalyticsItems(),
    });
    hasTrackedBeginCheckoutRef.current = true;
  }, [discountedSubtotal, items.length, toAnalyticsItems]);

  // Initialize Paystack payment with inline callbacks
  const initializePaystackPayment = (config: any) => {
    console.log('Initializing Paystack with config:', { 
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
          console.log('Payment window closed');
          toast.warning('Payment cancelled. Your order is still pending payment.');
          setIsProcessing(false);
          currentOrderRef.current = null;
        },
        callback: function(response: any) {
          console.log('Payment callback received:', response);
          handlePaymentSuccess(response);
        },
      });

      console.log('Opening Paystack iframe...');
      handler.openIframe();
    } catch (error) {
      console.error('Error initializing Paystack:', error);
      toast.error('Failed to open payment window. Please try again.');
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = async (response: any) => {
    console.log('✅ Paystack payment successful:', response);
    
    try {
      if (!currentOrderRef.current) {
        console.error('❌ No order reference found');
        toast.error('Order reference missing');
        setIsProcessing(false);
        return;
      }

      const orderId = currentOrderRef.current;
      
      toast.loading('Verifying payment...', { id: 'payment-verify' });

      const verifyResponse = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: response.reference,
          orderId: orderId,
          saveCard: saveCard && isAuthenticated,
          customerId: customerId,
        }),
      });

      const verifyData = await verifyResponse.json();

      console.log('🔍 Verification response:', verifyData);

      if (!verifyResponse.ok || !verifyData.success) {
        toast.error('Payment verification failed', { id: 'payment-verify' });
        console.error('Verification failed:', verifyData);
        setIsProcessing(false);
        return;
      }

      toast.success('Payment verified successfully!', { id: 'payment-verify' });
      console.log('✅ Payment verified, clearing cart...');
      
      await persistCheckoutProfileIfNeeded();

      if (verifyData.cardSaved) {
        toast.success('Payment card saved for future use!');
      }
      const redirectOrderId = verifyData.order?.id ?? orderId;
      trackPurchaseForOrder(redirectOrderId);
      clearCart();
      currentOrderRef.current = null;

      router.push(`/order-success?order=${redirectOrderId}`);
      
    } catch (error: any) {
      console.error('❌ Payment verification error:', error);
      toast.error(error.message || 'Payment verification failed', { id: 'payment-verify' });
      setIsProcessing(false);
    }
  };

  const handleSavedCardPayment = async (orderId: number) => {
    if (!defaultSavedCard || !isAuthenticated || !customerId) {
      toast.error('Unable to process payment with saved card');
      return;
    }

    try {
      console.log('Charging saved card...');
      setIsProcessing(true);

      const amountKobo = Math.max(0, Math.round(total * 100));
      if (amountKobo <= 0) {
        throw new Error('Invalid payment amount');
      }

      const chargeResponse = await fetch('/api/payments/charge-authorization', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-customer-id': customerId?.toString() || '',
        },
        body: JSON.stringify({
          customerId,
          email: formData.email || customer?.email,
          amount: amountKobo,
          authorization_code: defaultSavedCard.authorization_code,
          metadata: {
            order_id: orderId,
            customer_id: customerId,
          },
        }),
      });

      if (!chargeResponse.ok) {
        const errorData = await chargeResponse.json();
        throw new Error(errorData.error || 'Payment failed');
      }

      const chargeData = await chargeResponse.json();

      if (chargeData.success && chargeData.data?.status === 'success') {
        console.log('Saved card charged successfully');
        
        const reference = chargeData.data?.reference || chargeData.data?.id || 'paystack-charge';
        
        const verifyResponse = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: reference,
            orderId: orderId,
            saveCard: false,
            customerId: customerId,
          }),
        });

        if (verifyResponse.ok) {
          const savedCardVerify = await verifyResponse.json().catch(() => ({}));
          const savedCardOrderId = savedCardVerify?.order?.id ?? orderId;
          await persistCheckoutProfileIfNeeded();
          setIsProcessing(false);
          trackPurchaseForOrder(savedCardOrderId);
          clearCart();
          toast.success('Payment successful!');
          router.push(`/order-success?order=${savedCardOrderId}`);
        } else {
          throw new Error('Failed to update order status');
        }
      } else {
        throw new Error('Payment failed');
      }
    } catch (error: any) {
      console.error('Saved card payment error:', error);
      toast.error(error.message || 'Payment failed. Please try another payment method.');
      setIsProcessing(false);
    }
  };

  // Fetch shipping methods and payment gateways
  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        setLoading(true);

        const [allZonesWithMethods, gateways, rate] = await Promise.all([
          getAllShippingMethods(),
          getEnabledPaymentGateways(),
          getDefaultTaxRate(formData.country),
        ]);
        const zonesWithMethods = getMatchingShippingZoneData(
          allZonesWithMethods,
          formData.country,
          formData.state
        );
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
        } else {
          setSelectedShipping('');
          setShippingCost(null);
        }

        setPaymentGateways(gateways);
        
        if (gateways.length > 0) {
          setSelectedPayment(gateways[0].id);
        }

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
  }, [items, formData.country, formData.state]);

  useEffect(() => {
    if (customer) {
      const savedCardsMeta = (customer as any)?.meta_data?.find((m: any) => m.key === 'saved_payment_cards');
      if (savedCardsMeta?.value) {
        try {
          const parsed = typeof savedCardsMeta.value === 'string'
            ? JSON.parse(savedCardsMeta.value)
            : savedCardsMeta.value;
          if (Array.isArray(parsed)) {
            const def = parsed.find((c) => c.is_default) || parsed[0] || null;
            setDefaultSavedCard(def || null);
          }
        } catch (err) {
          console.error('Error parsing saved cards:', err);
        }
      }

      if (customer.shipping) {
        applyShippingAddress();
        setUseDifferentAddress(false);
        setSaveNewAddress(false);
      } else if (customer.billing) {
        applyBillingAddress();
        setUseDifferentAddress(true);
      }
    } else {
      setUseDifferentAddress(true);
    }
  }, [customer, applyBillingAddress, applyShippingAddress]);

  useEffect(() => {
    if (!useDifferentAddress && customer?.shipping) {
      applyShippingAddress();
      setSaveNewAddress(false);
    }
  }, [useDifferentAddress, customer, applyShippingAddress]);

  useEffect(() => {
    if (!defaultSavedCard || selectedPayment !== 'paystack') {
      setUseSavedCard(false);
    }
  }, [defaultSavedCard, selectedPayment]);

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

  const persistCheckoutProfileIfNeeded = async () => {
    if (!isAuthenticated || !customerId) return false;

    const shouldSaveAddress = saveNewAddress && useDifferentAddress;
    const existingShipping = customer?.shipping;
    const existingBilling = customer?.billing;

    const shippingPayload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      address_1: shouldSaveAddress ? formData.address1 : existingShipping?.address_1 || '',
      address_2: shouldSaveAddress ? formData.address2 : existingShipping?.address_2 || '',
      city: shouldSaveAddress ? formData.city : existingShipping?.city || '',
      state: shouldSaveAddress ? formData.state : existingShipping?.state || '',
      postcode: shouldSaveAddress ? formData.postcode : existingShipping?.postcode || '',
      country: shouldSaveAddress ? formData.country : existingShipping?.country || formData.country,
      phone: formData.phone,
      company: existingShipping?.company || '',
    };

    const billingPayload = {
      first_name: formData.firstName,
      last_name: formData.lastName,
      address_1: shouldSaveAddress ? formData.address1 : existingBilling?.address_1 || '',
      address_2: shouldSaveAddress ? formData.address2 : existingBilling?.address_2 || '',
      city: shouldSaveAddress ? formData.city : existingBilling?.city || '',
      state: shouldSaveAddress ? formData.state : existingBilling?.state || '',
      postcode: shouldSaveAddress ? formData.postcode : existingBilling?.postcode || '',
      country: shouldSaveAddress ? formData.country : existingBilling?.country || formData.country,
      email: formData.email,
      phone: formData.phone,
      company: existingBilling?.company || '',
    };

    try {
      const updated = await updateCustomer(customerId, {
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        shipping: shippingPayload,
        billing: billingPayload,
      });

      if (!updated) {
        if (shouldSaveAddress) {
          toast.error('Could not save address to your account');
        }
        return false;
      }

      await refreshCustomer();

      if (shouldSaveAddress) {
        toast.success('Address saved for future checkouts');
      }

      return true;
    } catch (error) {
      console.error('Checkout profile save error:', error);
      if (shouldSaveAddress) {
        toast.error('We could not save this address to your account');
      }
      return false;
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

  // NEW: Apply influencer coupon
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!formData.state || !formData.city) {
      toast.error('Please enter your delivery address first');
      return;
    }

    if (shippingCost === null) {
      toast.error('Please wait for shipping to be calculated');
      return;
    }

    if (appliedVoucher) {
      toast.error('Remove the campaign voucher to use an influencer code');
      return;
    }

    setIsApplyingCoupon(true);
    setCouponError('');

    try {
      const response = await fetch(
        'https://gfikkrwhsedhwmkxybzm.supabase.co/functions/v1/influencers/validate-coupon',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            coupon_code: couponCode.toUpperCase(),
            cart_total: subtotal,
            shipping_cost: shippingCost,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setCouponError(result.error || 'Invalid coupon code');
        return;
      }

      setAppliedCoupon({
        code: couponCode.toUpperCase(),
        influencer_id: result.data.influencer_id,
        influencer_name: result.data.influencer_name,
        shipping_discount: result.data.shipping_discount,
        message: result.data.message,
      });

      setShippingDiscount(result.data.shipping_discount);
      toast.success(result.data.message);
      setCouponCode('');

    } catch (error: any) {
      console.error('Coupon validation error:', error);
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const applyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Please enter a voucher code');
      return;
    }

    if (!formData.state || !formData.city) {
      toast.error('Please enter your delivery address first');
      return;
    }

    if (shippingCost === null) {
      toast.error('Please wait for shipping to be calculated');
      return;
    }

    setIsApplyingVoucher(true);
    setVoucherError('');

    try {
      const response = await fetch(VOUCHER_VALIDATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupon_code: voucherCode.trim().toUpperCase(),
          cart_total: subtotal,
          shipping_cost: shippingCost ?? 0,
          customer_email: formData.email || customer?.email || '',
          items: items.map((item: any) => ({
            product_id: item.productId,
            sku: item.sku || item.variation?.sku || '',
            variation_id: item.variation?.id,
            quantity: item.quantity,
            price: item.price,
            vendor_id: item.vendorId,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setVoucherError(result.error || result.message || 'Invalid voucher code');
        return;
      }

      // ✅ FIXED: Extract product_discount, not shipping_discount
      const productDiscount = result.data?.product_discount ?? result.data?.discount_value ?? 0;
      const normalizedDiscount =
        typeof productDiscount === 'string'
          ? parseFloat(productDiscount)
          : productDiscount;
      const voucherValue = Number.isFinite(normalizedDiscount)
        ? normalizedDiscount
        : 0;

      setAppliedVoucher(result.data);
      setVoucherDiscount(voucherValue);
      setVoucherError('');
      setVoucherCode('');
      removeCoupon({ showToast: false });
      
      // ✅ Better success message
      const matchingItems = result.data?.matching_items_count || items.length;
      const totalItems = result.data?.total_items_count || items.length;
      toast.success(
        matchingItems === totalItems
          ? `Voucher applied! ${formatPrice(voucherValue)} discount`
          : `Voucher applied to ${matchingItems} of ${totalItems} items! ${formatPrice(voucherValue)} discount`
      );
    } catch (error: any) {
      console.error('Voucher validation error:', error);
      setVoucherError(
        error?.message || 'Failed to validate voucher. Please try again.'
      );
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherDiscount(0);
    setVoucherError('');
    setVoucherCode('');
    toast.info('Voucher removed');
  };

  // NEW: Remove applied coupon
  const removeCoupon = ({ showToast = true } = {}) => {
    setAppliedCoupon(null);
    setShippingDiscount(0);
    if (showToast) {
      toast.info('Coupon removed');
    }
  };

  const handlePlaceOrder = async () => {
    if (loading) {
      toast.error('Checkout options are still loading. Please wait a moment.');
      return;
    }

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
      const orderVendorMeta = (() => {
        const vendorBuckets: Record<number, { vendor_id: number; vendor_name: string; items: number[] }> = {};

        items.forEach((item: any, idx: number) => {
          const vid = item.vendorId ? Number(item.vendorId) : undefined;
          const vname = item.vendorName || 'Vendor';
          if (!vid) return;
          if (!vendorBuckets[vid]) {
            vendorBuckets[vid] = { vendor_id: vid, vendor_name: vname, items: [] };
          }
          vendorBuckets[vid].items.push(idx);
        });

        const vendorsMetaValue = Object.values(vendorBuckets);

        return vendorsMetaValue.length
          ? [
              {
                key: '_wcfmmp_order_vendors',
                value: vendorsMetaValue,
              },
            ]
          : [];
      })();

      // ✅ FIXED: Only influencer coupons discount shipping
      const orderShippingDiscount = appliedCoupon ? shippingDiscount : 0;
      const shippingLineTotal = Math.max(0, (shippingCost ?? 0) - orderShippingDiscount);

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
        line_items: items.map((item: any) => {
          const vendorId = item.vendorId ? Number(item.vendorId) : undefined;
          const vendorName = item.vendorName || 'JulineMart Vendor';
          const attributeMeta = item.variation?.attributes
            ? Object.entries(item.variation.attributes).map(([key, value]) => ({
                key,
                value,
              }))
            : [];

          return {
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
              },
              ...(vendorId
                ? [
                    { key: '_vendor_id', value: vendorId.toString() },
                    { key: '_wcfm_vendor_id', value: vendorId.toString() },
                    { key: '_wcfmmp_vendor_id', value: vendorId.toString() },
                    { key: '_wcfmmp_product_author', value: vendorId.toString() },
                    { key: '_wcfmmp_sold_by', value: vendorId.toString() },
                  ]
                : []),
              ...(vendorName
                ? [
                    { key: '_vendor_name', value: vendorName },
                    { key: '_wcfm_vendor_name', value: vendorName },
                  ]
                : []),
              ...attributeMeta,
              ...(item.supabaseProductId
                ? [{ key: '_supabase_product_id', value: item.supabaseProductId }]
                : []),
              ...(item.variation?.supabaseId
                ? [{ key: '_supabase_variation_id', value: item.variation.supabaseId }]
                : []),
            ],
          };
        }),
        meta_data: [
          ...orderVendorMeta,
          {
            key: 'wcfm_order_vendors',
            value: Array.from(new Set(items.map((item: any) => item.vendorId).filter(Boolean))).join(','),
          },
          {
            key: '_hub_id',
            value: items[0]?.hubId || DEFAULT_HUB_ID,
          },
          {
            key: '_hub_name',
            value: items[0]?.hubName || 'Default Hub',
          },
          ...(selectedOption?.zoneId
            ? [{ key: '_jlo_destination_zone_id', value: String(selectedOption.zoneId) }]
            : []),
          ...(selectedOption?.title
            ? [{ key: '_jlo_destination_zone_name', value: selectedOption.title }]
            : []),
          // NEW: Influencer coupon data
          ...(appliedCoupon ? [
            {
              key: '_influencer_coupon_code',
              value: appliedCoupon.code,
            },
            {
              key: '_influencer_id',
              value: appliedCoupon.influencer_id,
            },
            {
              key: '_shipping_discount',
              value: shippingDiscount.toString(),
            },
          ] : []),
          ...(appliedVoucher ? [
            {
              key: '_campaign_voucher_id',
              value: appliedVoucher.id,
            },
            {
              key: '_campaign_voucher_code',
              value: appliedVoucher.code,
            },
            {
              key: '_voucher_discount',
              value: voucherDiscount.toString(),
            },
          ] : []),
        ],
        shipping_lines: selectedShipping ? [{
          method_id: selectedOption?.methodId || 'flat_rate',
          method_title: selectedOption?.title || 'Shipping',
          total: shippingLineTotal.toString(),
          meta_data: orderShippingDiscount > 0 ? [
            {
              key: '_original_shipping_cost',
              value: shippingCost?.toString() || '0',
            },
            {
              key: '_shipping_discount',
              value: orderShippingDiscount.toString(),
            },
          ] : [],
        }] : [],
        // NEW: Add coupon_lines for webhook detection
        coupon_lines: appliedVoucher ? [{
          code: appliedVoucher.code,
          discount: voucherDiscount.toString(),
          discount_type: appliedVoucher.discount_type || 'fixed_cart',
        }] : appliedCoupon ? [{
          code: appliedCoupon.code,
          discount: shippingDiscount.toString(),
          discount_type: 'shipping',
        }] : [],
        customer_note: formData.notes,
      };

      console.log('📦 Creating order with coupon info:', orderData);

      const createOrderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!createOrderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const order = await createOrderResponse.json();

      if (order && order.id) {
        console.log('✅ Order created:', order.id);
        
        const selectedGateway = paymentGateways.find(g => g.id === selectedPayment);
        const requiresPayment = selectedGateway?.id !== 'cod' && 
                               selectedGateway?.id !== 'bacs' && 
                               selectedGateway?.id !== 'cheque';

        if (requiresPayment) {
          const amountKobo = Math.max(0, Math.round(total * 100));
          if (amountKobo <= 0) {
            toast.error('Invalid payment amount');
            setIsProcessing(false);
            return;
          }

          if (useSavedCard && defaultSavedCard && isAuthenticated) {
            await handleSavedCardPayment(order.payment_reference ?? order.id);
          } else {
            currentOrderRef.current = order.payment_reference ?? order.id;

            const paystackConfig = {
              reference: order.payment_reference ?? `JLM_${order.id}_${Date.now()}`,
              email: formData.email,
              amount: amountKobo,
              publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
              metadata: {
                order_id: order.id,
                customer_id: customerId || 'guest',
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
            
            setTimeout(() => {
              initializePaystackPayment(paystackConfig);
            }, 500);
          }
        } else {
          await persistCheckoutProfileIfNeeded();
          trackPurchaseForOrder(order.id);
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

  if (!isCartHydrated) {
    return <PageLoading text="Loading checkout..." />;
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
  const isPaystackGateway = selectedPayment === 'paystack';
  const hasSavedShipping = Boolean(
    customer?.shipping &&
    (customer.shipping.address_1 || customer.shipping.city || customer.shipping.state)
  );

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/cart" className="text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Checkout</h1>
        </div>

        {loading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Loading shipping and payment options...
          </div>
        )}

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
              
              {hasSavedShipping && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-green-900 mb-1">Saved Address</p>
                      <p className="text-sm text-green-800">
                        {customer?.shipping?.first_name} {customer?.shipping?.last_name}{customer?.shipping?.first_name || customer?.shipping?.last_name ? ' • ' : ''}
                        {customer?.shipping?.address_1}{customer?.shipping?.city ? `, ${customer.shipping.city}` : ''}{customer?.shipping?.state ? `, ${customer.shipping.state}` : ''}
                      </p>
                      {customer?.shipping?.phone && (
                        <p className="text-xs text-green-700 mt-1">Phone: {customer.shipping.phone}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !useDifferentAddress;
                        setUseDifferentAddress(next);
                        if (!next) {
                          applyShippingAddress();
                          setSaveNewAddress(false);
                        }
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {useDifferentAddress ? 'Use saved address' : 'Use different address'}
                    </button>
                  </div>
                </div>
              )}

              {(!hasSavedShipping || useDifferentAddress) && (
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
                        <option value="Abia">Abia</option>
                        <option value="Adamawa">Adamawa</option>
                        <option value="Akwa Ibom">Akwa Ibom</option>
                        <option value="Anambra">Anambra</option>
                        <option value="Bauchi">Bauchi</option>
                        <option value="Bayelsa">Bayelsa</option>
                        <option value="Benue">Benue</option>
                        <option value="Borno">Borno</option>
                        <option value="Cross River">Cross River</option>
                        <option value="Delta">Delta</option>
                        <option value="Ebonyi">Ebonyi</option>
                        <option value="Edo">Edo</option>
                        <option value="Ekiti">Ekiti</option>
                        <option value="Enugu">Enugu</option>
                        <option value="FCT">Federal Capital Territory (Abuja)</option>
                        <option value="Gombe">Gombe</option>
                        <option value="Imo">Imo</option>
                        <option value="Jigawa">Jigawa</option>
                        <option value="Kaduna">Kaduna</option>
                        <option value="Kano">Kano</option>
                        <option value="Katsina">Katsina</option>
                        <option value="Kebbi">Kebbi</option>
                        <option value="Kogi">Kogi</option>
                        <option value="Kwara">Kwara</option>
                        <option value="Lagos">Lagos</option>
                        <option value="Nasarawa">Nasarawa</option>
                        <option value="Niger">Niger</option>
                        <option value="Ogun">Ogun</option>
                        <option value="Ondo">Ondo</option>
                        <option value="Osun">Osun</option>
                        <option value="Oyo">Oyo</option>
                        <option value="Plateau">Plateau</option>
                        <option value="Rivers">Rivers</option>
                        <option value="Sokoto">Sokoto</option>
                        <option value="Taraba">Taraba</option>
                        <option value="Yobe">Yobe</option>
                        <option value="Zamfara">Zamfara</option>
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

                  {isAuthenticated && (
                    <label className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={(e) => setSaveNewAddress(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Save this address for future orders</p>
                        <p className="text-sm text-gray-600">We will add it to your profile once this order is placed.</p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {!useDifferentAddress && hasSavedShipping && (
                <p className="text-sm text-gray-600">
                  We&apos;ll deliver to your saved address above. Select &quot;Use different address&quot; if you need to update it.
                </p>
              )}

              <div className="mt-4">
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

            {/* Shipping Method */}
            {(loading || shippingOptions.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Shipping Method</h2>
                </div>

                {shippingOptions.length > 0 ? (
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
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Loading shipping methods...</p>
                )}

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

            {/* NEW: Discount Code + Voucher */}
            {shippingCost !== null && shippingCost > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Tag className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Discount Code</h2>
                </div>

                <div className="space-y-5">
                  <div className="space-y-3">
                    {appliedVoucher ? (
                      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">
                              {appliedVoucher.code} Applied
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              {appliedVoucher.message}
                            </p>
                            {voucherDiscount > 0 && (
                              <p className="text-xs text-gray-600 mt-1">
                                Product discount: -{formatPrice(voucherDiscount)}
                                {appliedVoucher?.matching_items_count < appliedVoucher?.total_items_count && 
                                  ` (applied to ${appliedVoucher.matching_items_count} of ${appliedVoucher.total_items_count} items)`
                                }
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={removeVoucher}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter campaign voucher"
                            value={voucherCode}
                            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                            disabled={isApplyingVoucher}
                            fullWidth
                          />
                          <Button
                            onClick={applyVoucher}
                            disabled={
                              !voucherCode.trim() ||
                              isApplyingVoucher ||
                              shippingCost === null
                            }
                            isLoading={isApplyingVoucher}
                            variant="secondary"
                            size="md"
                            className="whitespace-nowrap"
                            type="button"
                          >
                            Apply
                          </Button>
                        </div>
                        {voucherError && (
                          <p className="text-sm text-red-600">{voucherError}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Vouchers are validated once shipping has been calculated.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    {appliedCoupon ? (
                      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">
                              {appliedCoupon.code} Applied
                            </p>
                            <p className="text-sm text-green-700 mt-1">
                              {appliedCoupon.message}
                            </p>
                          </div>
                          <button
                            onClick={() => removeCoupon()}
                            type="button"
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter influencer code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            disabled={isApplyingCoupon || Boolean(appliedVoucher)}
                            fullWidth
                          />
                          <Button
                            onClick={applyCoupon}
                            disabled={!couponCode || isApplyingCoupon || Boolean(appliedVoucher)}
                            isLoading={isApplyingCoupon}
                            variant="secondary"
                            size="md"
                            className="whitespace-nowrap"
                            type="button"
                          >
                            Apply
                          </Button>
                        </div>
                        {couponError && (
                          <p className="text-sm text-red-600">{couponError}</p>
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {appliedVoucher
                        ? 'Remove the campaign voucher to use an influencer code.'
                        : '💡 Have an influencer code? Save on shipping!'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method */}
            {(loading || paymentGateways.length > 0) && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                {paymentGateways.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading payment methods...</p>
                ) : (
                  <>
                {isAuthenticated && defaultSavedCard && isPaystackGateway && (
                  <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSavedCard}
                        onChange={(e) => setUseSavedCard(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-blue-600" />
                          <span className="font-medium text-gray-900">
                            Use my saved card
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {defaultSavedCard.card_type.toUpperCase()} ending in {defaultSavedCard.last4}
                          {' • '}Expires {defaultSavedCard.exp_month}/{defaultSavedCard.exp_year}
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {(!useSavedCard || !isPaystackGateway) && (
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
                )}

                {isAuthenticated && !useSavedCard && isPaystackGateway && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="mt-1 w-4 h-4 text-primary-600"
                      />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">
                          Save this card for future payments
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          Securely save your payment information for faster checkout next time
                        </p>
                      </div>
                    </label>
                  </div>
                )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-4 pb-4 border-b max-h-64 overflow-y-auto">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-2 text-sm items-start"
                  >
                    <span className="text-gray-600 leading-snug">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-right whitespace-nowrap">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                
                {/* ✅ Show product discount from voucher */}
                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Product Discount</span>
                    <span className="font-medium">-{formatPrice(voucherDiscount)}</span>
                  </div>
                )}
                
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
                
                {/* ✅ Show shipping discount from influencer coupon */}
                {activeShippingDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Shipping Discount</span>
                    <span className="font-medium">-{formatPrice(activeShippingDiscount)}</span>
                  </div>
                )}
                
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
                disabled={
                  isProcessing ||
                  loading ||
                  !selectedPayment ||
                  (selectedOption?.methodId === 'jlo_shipping' && shippingCost === null)
                }
              >
                {isProcessing
                  ? 'Processing...'
                  : loading
                    ? 'Loading checkout options...'
                    : 'Place Order'}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                By placing your order, you agree to our{' '}
                <Link href="/page/terms-of-service" className="text-primary-600 hover:text-primary-700 underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/page/privacy-policy" className="text-primary-600 hover:text-primary-700 underline">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
