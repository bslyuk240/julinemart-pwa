'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Truck, Package, MapPin, Tag } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
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
import {
  resolveLineWeightKg,
  DEFAULT_SHIPPING_LINE_WEIGHT_KG,
} from '@/lib/shipping/cart-weight';
import { getSavedCards, upsertAddress, updateCustomerProfile, getAddresses } from '@/lib/supabase/customers';
import type { CustomerAddress, SavedCard } from '@/types/customer';
import { trackBeginCheckout, trackPurchase } from '@/lib/gtag';
import { useCartStore } from '@/store/cart-store';
import { jloItemIdsFromCartLine } from '@/lib/jlo/line-identity';
import { ensurePaystackReady, resetPaystackLoader } from '@/lib/paystack';
import { logActivity } from '@/lib/logActivity';
import {
  clearPendingCampaignVoucher,
  readPendingCampaignVoucher,
} from '@/components/campaigns/OfferSection';

interface ShippingOption {
  id: string;
  title: string;
  cost: number | null;
  description?: string;
  zoneId: number;
  methodId: string;
}


const DEFAULT_HUB_ID = '75489a58-69bf-4f17-8d21-880e8196e31d';

/**
 * Campaign vouchers: browser must call same-origin `/api/vouchers/validate` only.
 * That route server-proxies to JLO `voucherHelpers`. Do not set
 * `NEXT_PUBLIC_VOUCHER_VALIDATION_URL` to `https://jlo...` — the browser will hit CORS
 * (JLO allows production origin only). Optional override: a path on this app, e.g. `/api/vouchers/validate`.
 */
function getVoucherValidationUrl(): string {
  const raw = process.env.NEXT_PUBLIC_VOUCHER_VALIDATION_URL?.trim();
  if (raw?.startsWith('/')) return raw;
  return '/api/vouchers/validate';
}
/** Same-origin API proxies to Supabase or JLO — do not use JLO catalog /api (404). */
const INFLUENCER_VALIDATION_URL =
  process.env.NEXT_PUBLIC_INFLUENCER_COUPON_VALIDATION_URL ||
  '/api/influencers/validate-coupon';

// Declare Paystack type
declare global {
  interface Window {
    PaystackPop: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, customer, isAuthenticated, refreshCustomer } = useCustomerAuth();
  const customerId = user?.id ?? null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCartHydrated, setIsCartHydrated] = useState(false);
  const currentOrderRef = useRef<any>(null);
  const pendingPaystackConfigRef = useRef<any>(null);
  const [hasPendingPayment, setHasPendingPayment] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const hasTrackedBeginCheckoutRef = useRef(false);
  
  // Saved card state
  const [defaultSavedCard, setDefaultSavedCard] = useState<SavedCard | null>(null);
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  // Saved address state (from Supabase customer_addresses)
  const [defaultShippingAddress, setDefaultShippingAddress] = useState<CustomerAddress | null>(null);
  
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

  // Promo code UI — one field for campaign voucher or influencer code
  const [promoKind, setPromoKind] = useState<'voucher' | 'influencer'>('voucher');
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

  // Prefill campaign voucher saved from "Save offer & shop" on a landing page.
  useEffect(() => {
    const pending = readPendingCampaignVoucher();
    if (!pending) return;
    setPromoKind('voucher');
    setVoucherCode(pending);
  }, []);

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
    if (!defaultShippingAddress) return;

    setFormData((prev) => ({
      ...prev,
      firstName: defaultShippingAddress.first_name || customer?.first_name || prev.firstName,
      lastName: defaultShippingAddress.last_name || customer?.last_name || prev.lastName,
      email: prev.email || customer?.email || '',
      phone: defaultShippingAddress.phone || customer?.phone || prev.phone,
      address1: defaultShippingAddress.address_1 || prev.address1,
      address2: defaultShippingAddress.address_2 || prev.address2,
      city: defaultShippingAddress.city || prev.city,
      state: defaultShippingAddress.state || prev.state,
      postcode: defaultShippingAddress.postcode || prev.postcode,
      country: defaultShippingAddress.country || prev.country || 'NG',
    }));
  }, [customer, defaultShippingAddress]);

  // No-op kept for compatibility; billing addresses not auto-applied
  const applyBillingAddress = useCallback((): void => {}, []);

  const formatPrice = (price: number) => `NGN ${price.toLocaleString()}`;
  
  // ✅ FIXED: Correct calculation - vouchers discount products, coupons discount shipping
  const activeShippingDiscount = appliedCoupon ? shippingDiscount : 0; // Only influencer coupons discount shipping
  const discountedShipping = Math.max(0, (shippingCost || 0) - activeShippingDiscount);
  const discountedSubtotal = Math.max(0, subtotal - voucherDiscount); // Vouchers discount products
  const total = discountedSubtotal + discountedShipping + taxAmount;

  /** Total kg sent to JLO calc-shipping (per line: DB weight or default). */
  const jloCartWeightKg = useMemo(
    () =>
      items.reduce(
        (sum, item: any) =>
          sum + resolveLineWeightKg(item.weight) * (Number(item.quantity) || 1),
        0
      ),
    [items]
  );

  const linesMissingProductWeight = useMemo(
    () =>
      items.filter(
        (item: any) => item.weight == null || !Number.isFinite(Number(item.weight))
      ).length,
    [items]
  );

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

  // Preload Paystack as soon as checkout mounts so the popup is ready well
  // before the user taps Place Order. Readiness gates nothing hard — the open
  // path awaits ensurePaystackReady() — but it lets us surface load failures.
  useEffect(() => {
    let cancelled = false;
    ensurePaystackReady()
      .then(() => {
        if (!cancelled) setPaystackReady(true);
      })
      .catch(() => {
        if (!cancelled) setPaystackReady(false);
      });
    return () => {
      cancelled = true;
    };
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

  // Initialize Paystack payment with inline callbacks.
  // Awaits the robust loader (no fixed setTimeout guess) so the popup opens as
  // soon as the gateway is genuinely ready, with an honest message + retry path
  // if it never loads. Gateway problems are logged to JLO activity logs.
  const initializePaystackPayment = async (config: any) => {
    console.log('Initializing Paystack with config:', {
      ref: config.reference,
      email: config.email,
      amount: config.amount,
    });

    const orderResourceId = config?.metadata?.order_id;

    // Wait for the gateway to be ready instead of guessing with a timer.
    try {
      await ensurePaystackReady();
      setPaystackReady(true);
    } catch {
      setPaystackReady(false);
      resetPaystackLoader();
      toast.dismiss('paystack-open');
      toast.error(
        'The payment window is taking too long to load. Check your connection and tap "Retry Payment".'
      );
      setIsProcessing(false);
      setHasPendingPayment(true);
      logActivity({
        action: 'PAYMENT_GATEWAY_LOAD_FAILED',
        resource_type: 'orders',
        resource_id: orderResourceId,
        details: { reference: config.reference, reason: 'inline.js failed to load before timeout' },
      });
      return;
    }

    // Always open Paystack with a FRESH transaction reference. Reusing the ref
    // from an abandoned/cancelled attempt makes Paystack treat it as a duplicate
    // and the iframe hangs on an endless loading spinner. The JLO order is still
    // located via currentOrderRef (the stable payment_reference) at verify time,
    // so a fresh Paystack ref is safe. config.reference is the stable base.
    const freshRef = `${config.reference}-R${Date.now().toString(36).toUpperCase()}`;

    try {
      logActivity({
        action: 'PAYMENT_INITIATED',
        resource_type: 'orders',
        resource_id: orderResourceId,
        details: { reference: freshRef, amount: config.amount },
      });

      const handler = window.PaystackPop.setup({
        key: config.publicKey,
        email: config.email,
        amount: config.amount,
        ref: freshRef,
        metadata: config.metadata,
        onClose: function() {
          console.log('Payment window closed');
          toast.dismiss('paystack-open');
          toast.warning('Payment cancelled. Click "Retry Payment" to complete your order.');
          setIsProcessing(false);
          setHasPendingPayment(true);
          logActivity({
            action: 'PAYMENT_CANCELLED',
            resource_type: 'orders',
            resource_id: orderResourceId,
            details: { reference: freshRef, stage: 'popup_closed' },
          });
        },
        callback: function(response: any) {
          console.log('Payment callback received:', response);
          handlePaymentSuccess(response);
        },
      });

      console.log('Opening Paystack iframe...');
      handler.openIframe();
      // Popup is open — clear the "Opening payment window..." spinner now.
      toast.dismiss('paystack-open');
    } catch (error) {
      console.error('Error initializing Paystack:', error);
      toast.dismiss('paystack-open');
      toast.error('Failed to open payment window. Please try again.');
      setIsProcessing(false);
      setHasPendingPayment(true);
      logActivity({
        action: 'PAYMENT_GATEWAY_OPEN_FAILED',
        resource_type: 'orders',
        resource_id: orderResourceId,
        details: { reference: freshRef, error: String((error as Error)?.message || error) },
      });
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
          customerEmail: formData.email || customer?.email,
        }),
      });

      const verifyData = await verifyResponse.json();

      console.log('🔍 Verification response:', verifyData);

      if (!verifyResponse.ok || !verifyData.success) {
        const errMsg = verifyData.error || 'Payment verification failed';
        toast.error(errMsg, { id: 'payment-verify' });
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
      pendingPaystackConfigRef.current = null;
      setHasPendingPayment(false);

      const orderNum = verifyData.order?.order_number;
      router.push(`/order-success?ref=${orderNum || redirectOrderId}`);
      
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
          const savedCardOrderNum = savedCardVerify?.order?.order_number;
          router.push(`/order-success?ref=${savedCardOrderNum || savedCardOrderId}`);
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
    if (customer && user) {
      // Pre-fill basic contact info from Supabase profile
      setFormData((prev) => ({
        ...prev,
        email: prev.email || customer.email || '',
        firstName: prev.firstName || customer.first_name || '',
        lastName: prev.lastName || customer.last_name || '',
        phone: prev.phone || customer.phone || '',
      }));

      // Load saved cards from Supabase
      getSavedCards(user.id)
        .then((cards) => {
          const def = cards.find((c) => c.is_default) || cards[0] || null;
          setDefaultSavedCard(def || null);
        })
        .catch((err) => console.error('Error loading saved cards:', err));

      // Load addresses from Supabase
      getAddresses(user.id)
        .then((addresses) => {
          const shipping =
            addresses.find((a) => a.type === 'shipping' && a.is_default) ||
            addresses.find((a) => a.type === 'shipping') ||
            null;
          setDefaultShippingAddress(shipping);
          if (shipping) {
            setUseDifferentAddress(false);
            setSaveNewAddress(false);
          } else {
            setUseDifferentAddress(true);
          }
        })
        .catch((err) => console.error('Error loading addresses:', err));
    } else if (!customer) {
      setUseDifferentAddress(true);
    }
  }, [customer, user]);

  useEffect(() => {
    if (!useDifferentAddress && defaultShippingAddress) {
      applyShippingAddress();
      setSaveNewAddress(false);
    }
  }, [useDifferentAddress, defaultShippingAddress, applyShippingAddress]);

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
          weight: resolveLineWeightKg(item.weight),
          price: Number(item.price) || 0,
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
    if (!isAuthenticated || !customerId || !user) return false;

    const shouldSaveAddress = saveNewAddress && useDifferentAddress;

    try {
      // Update basic profile (name, phone)
      await updateCustomerProfile(user.id, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone || null,
      });

      // Save address to Supabase if requested
      if (shouldSaveAddress) {
        await upsertAddress(user.id, {
          type: 'shipping',
          label: 'Home',
          first_name: formData.firstName,
          last_name: formData.lastName,
          company: null,
          address_1: formData.address1,
          address_2: formData.address2 || null,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode || null,
          country: formData.country,
          phone: formData.phone || null,
          email: formData.email || null,
          is_default: !defaultShippingAddress,
        });
        toast.success('Address saved for future checkouts');
      }

      await refreshCustomer();
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

    // Accept any common Nigerian format: +2348012345678, 2348012345678,
    // 08012345678, or a bare 8012345678. Normalise to digits first so we don't
    // reject a perfectly valid stored number just because of its prefix/spacing.
    if (formData.phone) {
      const digits = formData.phone.replace(/\D/g, '');
      const localTen = digits.startsWith('234')
        ? digits.slice(3)
        : digits.startsWith('0')
        ? digits.slice(1)
        : digits;
      // local part must be 10 digits starting 7/8/9 (e.g. 8012345678)
      if (!/^[789]\d{9}$/.test(localTen)) {
        newErrors.phone = 'Invalid Nigerian phone number';
      }
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
      const response = await fetch(INFLUENCER_VALIDATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupon_code: couponCode.toUpperCase(),
          cart_total: subtotal,
          shipping_cost: shippingCost,
        }),
      });

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
      const response = await fetch(getVoucherValidationUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupon_code: voucherCode.trim().toUpperCase(),
          cart_total: subtotal,
          shipping_cost: shippingCost ?? 0,
          customer_email: formData.email || customer?.email || '',
          // Must match POST /api/orders → JLO create-order line identity (see jlo/line-identity).
          items: items.map((item: any) => {
            const { product_id, variation_id } = jloItemIdsFromCartLine(item);
            return {
              product_id,
              sku: item.sku || item.variation?.sku || '',
              variation_id,
              quantity: item.quantity,
              price: item.price,
              vendor_id: item.vendorId,
            };
          }),
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

      // JLO `voucherHelpers` may not echo `code` on `data` — we must keep the
      // canonical string for order meta and create-order, or JLO returns "Invalid or expired voucher code".
      const appliedCode = voucherCode.trim().toUpperCase();
      setAppliedVoucher({
        ...result.data,
        code: result.data?.code ?? result.data?.coupon_code ?? appliedCode,
      });
      setVoucherDiscount(voucherValue);
      setVoucherError('');
      setVoucherCode('');
      clearPendingCampaignVoucher();
      removeCoupon({ showToast: false });
      
      toast.success(`Voucher applied (−${formatPrice(voucherValue)})`);

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
        const vendorBuckets: Record<
          string,
          { vendor_id: string; vendor_name: string; items: number[] }
        > = {};

        items.forEach((item: any, idx: number) => {
          const vk =
            item.vendorId != null && item.vendorId !== ''
              ? String(item.vendorId)
              : '';
          const vname = item.vendorName || 'Vendor';
          if (!vk) return;
          if (!vendorBuckets[vk]) {
            vendorBuckets[vk] = { vendor_id: vk, vendor_name: vname, items: [] };
          }
          vendorBuckets[vk].items.push(idx);
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
          const vendorIdStr =
            item.vendorId != null && item.vendorId !== '' ? String(item.vendorId) : '';
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
              ...(vendorIdStr
                ? [
                    { key: '_vendor_id', value: vendorIdStr },
                    { key: '_wcfm_vendor_id', value: vendorIdStr },
                    { key: '_wcfmmp_vendor_id', value: vendorIdStr },
                    { key: '_wcfmmp_product_author', value: vendorIdStr },
                    { key: '_wcfmmp_sold_by', value: vendorIdStr },
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
            value: Array.from(
              new Set(
                items
                  .map((item: any) => item.vendorId)
                  .filter((id: unknown) => id != null && id !== '')
                  .map((id: unknown) => String(id))
              )
            ).join(','),
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
        const errData = await createOrderResponse.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || 'Failed to create order');
      }

      const order = await createOrderResponse.json();

      if (order && order.id) {
        console.log('✅ Order created:', order.id);
        // ORDER_PLACED is logged server-side in JLO create-order (captures guests too).

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
                    display_name: 'Order Number',
                    variable_name: 'order_number',
                    value: order.order_number ? `#${order.order_number}` : order.id.toString(),
                  },
                  {
                    display_name: 'Customer Name',
                    variable_name: 'customer_name',
                    value: `${formData.firstName} ${formData.lastName}`
                  },
                ],
              },
            };

            pendingPaystackConfigRef.current = paystackConfig;
            setHasPendingPayment(false);
            // duration is a safety net: a loading toast otherwise lives
            // forever, so if any path misses the dismiss it still self-clears.
            toast.loading('Opening payment window...', { id: 'paystack-open', duration: 15000 });

            // Await the robust loader rather than guessing with a timer; the
            // toast clears as soon as the popup opens (or an error is shown).
            await initializePaystackPayment(paystackConfig);
            toast.dismiss('paystack-open');
          }
        } else {
          await persistCheckoutProfileIfNeeded();
          trackPurchaseForOrder(order.id);
          clearCart();
          toast.success('Order placed successfully!');
          router.push(`/order-success?ref=${order.order_number || order.id}`);
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
          <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-4">Your cart is empty</h2>
          <Link href="/" className="text-xs md:text-sm text-primary-600 hover:text-primary-700 font-medium">
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  const selectedOption = shippingOptions.find(o => o.id === selectedShipping);
  const isPaystackGateway = selectedPayment === 'paystack';
  const hasSavedShipping = Boolean(
    defaultShippingAddress &&
    (defaultShippingAddress.address_1 || defaultShippingAddress.city || defaultShippingAddress.state)
  );
  const hasRequiredAddress = Boolean(
    formData.firstName.trim() &&
    formData.lastName.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.address1.trim() &&
    formData.city.trim() &&
    formData.state.trim() &&
    formData.country.trim()
  );
  const shippingReady =
    Boolean(selectedOption) &&
    (selectedOption?.methodId !== 'jlo_shipping' || shippingCost !== null);
  const isCheckoutReady =
    !loading &&
    hasRequiredAddress &&
    Boolean(selectedPayment) &&
    Boolean(selectedShipping) &&
    shippingReady &&
    !shippingError &&
    !isProcessing;

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom min-w-0 py-5 md:py-6">
        <PageHeader
          title="Checkout"
          subtitle="Review your details and place your order"
          backHref="/cart"
          backLabel="Back to cart"
        />

        {loading && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Loading shipping and payment options...
          </div>
        )}

        <div className="grid min-w-0 gap-6 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="min-w-0 space-y-6 lg:col-span-2">
            {/* Customer Information */}
            <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-5 h-5 text-primary-600" />
                <h2 className="text-sm md:text-base font-semibold text-gray-900">Contact Information</h2>
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
            <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-6 h-6 text-primary-600" />
                <h2 className="text-sm md:text-base font-semibold text-gray-900">Delivery Address</h2>
              </div>
              
              {hasSavedShipping && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-green-900 mb-1">Saved Address</p>
                      <p className="text-sm text-green-800">
                        {defaultShippingAddress?.first_name} {defaultShippingAddress?.last_name}{defaultShippingAddress?.first_name || defaultShippingAddress?.last_name ? ' • ' : ''}
                        {defaultShippingAddress?.address_1}{defaultShippingAddress?.city ? `, ${defaultShippingAddress.city}` : ''}{defaultShippingAddress?.state ? `, ${defaultShippingAddress.state}` : ''}
                      </p>
                      {defaultShippingAddress?.phone && (
                        <p className="text-xs text-green-700 mt-1">Phone: {defaultShippingAddress.phone}</p>
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
              <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-primary-600" />
                  <h2 className="text-sm md:text-base font-semibold text-gray-900">Shipping Method</h2>
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
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center justify-between gap-2">
                              <p className="min-w-0 break-words font-medium text-gray-900">{option.title}</p>
                              <p className="shrink-0 font-semibold text-primary-600">
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

            {/* Promo code — single voucher / influencer entry */}
            {shippingCost !== null && (
              <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Tag className="h-6 w-6 text-primary-600" />
                  <h2 className="text-sm font-semibold text-gray-900 md:text-base">Have a promo code?</h2>
                </div>

                {appliedVoucher || appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                    <p className="min-w-0 truncate text-sm font-semibold text-green-900">
                      {(appliedVoucher?.code || appliedCoupon?.code)} applied
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (appliedVoucher) removeVoucher();
                        else removeCoupon();
                      }}
                      className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <select
                      value={promoKind}
                      onChange={(e) => {
                        const next = e.target.value as 'voucher' | 'influencer';
                        setPromoKind(next);
                        setVoucherError('');
                        setCouponError('');
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    >
                      <option value="voucher">Campaign voucher</option>
                      <option value="influencer">Influencer code</option>
                    </select>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <div className="min-w-0 w-full sm:flex-1">
                        <Input
                          placeholder={
                            promoKind === 'voucher'
                              ? 'Enter voucher code'
                              : 'Enter influencer code'
                          }
                          value={promoKind === 'voucher' ? voucherCode : couponCode}
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            if (promoKind === 'voucher') setVoucherCode(value);
                            else setCouponCode(value);
                          }}
                          disabled={isApplyingVoucher || isApplyingCoupon}
                          fullWidth
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (promoKind === 'voucher') applyVoucher();
                          else applyCoupon();
                        }}
                        disabled={
                          (promoKind === 'voucher'
                            ? !voucherCode.trim() || isApplyingVoucher
                            : !couponCode.trim() || isApplyingCoupon) || shippingCost === null
                        }
                        isLoading={promoKind === 'voucher' ? isApplyingVoucher : isApplyingCoupon}
                        variant="secondary"
                        size="sm"
                        className="w-full shrink-0 whitespace-nowrap sm:w-auto"
                        type="button"
                      >
                        Apply
                      </Button>
                    </div>

                    {(voucherError || couponError) && (
                      <p className="text-sm text-red-600">{voucherError || couponError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Payment Method */}
            {(loading || paymentGateways.length > 0) && (
              <div className="rounded-2xl bg-white p-4 shadow-sm md:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <CreditCard className="w-6 h-6 text-primary-600" />
                  <h2 className="text-sm md:text-base font-semibold text-gray-900">Payment Method</h2>
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
                          {(defaultSavedCard.card_type ?? 'Card').toUpperCase()} ending in {defaultSavedCard.last4}
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
                        <div className="min-w-0">
                          <p className="break-words font-medium text-gray-900">{gateway.title}</p>
                          {gateway.description && (
                            <p className="mt-1 break-words text-sm text-gray-600">{gateway.description}</p>
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
          <div className="min-w-0 lg:col-span-1">
            <div className="sticky top-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">
              <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="mb-4 max-h-64 space-y-3 overflow-y-auto overflow-x-hidden border-b pb-4">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_auto] gap-2 text-sm items-start"
                  >
                    <span className="min-w-0 break-words text-gray-600 leading-snug">
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
                {selectedOption?.methodId === 'jlo_shipping' && items.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Est. weight for quote: {jloCartWeightKg.toFixed(2)} kg
                    {linesMissingProductWeight > 0                      ? ` (${linesMissingProductWeight} line(s) use ${DEFAULT_SHIPPING_LINE_WEIGHT_KG} kg default — add weight on the product in admin for accuracy)`
                      : ''}
                  </p>
                )}
                
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

              {hasPendingPayment ? (
                <div className="space-y-2">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
                    Your order was created but payment was not completed.
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    isLoading={isProcessing}
                    onClick={async () => {
                      if (pendingPaystackConfigRef.current) {
                        setIsProcessing(true);
                        toast.loading('Opening payment window...', { id: 'paystack-open', duration: 15000 });
                        await initializePaystackPayment(pendingPaystackConfigRef.current);
                        toast.dismiss('paystack-open');
                      }
                    }}
                  >
                    {isProcessing ? 'Processing...' : 'Retry Payment'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-xs text-gray-500 underline hover:text-gray-700"
                    onClick={async () => {
                      const orderId = currentOrderRef.current;
                      if (orderId) {
                        try {
                          await fetch(`/api/orders/${orderId}/cancel`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ reason: 'Customer cancelled before completing payment' }),
                          });
                        } catch {
                          // best-effort — don't block the user if cancel call fails
                        }
                      }
                      currentOrderRef.current = null;
                      pendingPaystackConfigRef.current = null;
                      setHasPendingPayment(false);
                    }}
                  >
                    Cancel and place a new order instead
                  </button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={isProcessing}
                  onClick={handlePlaceOrder}
                  disabled={
                    !isCheckoutReady ||
                    (selectedOption?.methodId === 'jlo_shipping' && shippingCost === null)
                  }
                >
                  {isProcessing
                    ? 'Processing...'
                    : loading
                      ? 'Loading checkout options...'
                      : 'Place Order'}
                </Button>
              )}

              {!paystackReady && !loading && !hasPendingPayment && (
                <p className="mt-2 text-center text-xs text-gray-400">
                  Preparing secure payment…
                </p>
              )}

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
