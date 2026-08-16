'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  Gift,
  Heart,
  MapPin,
  Package,
  Clock,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Search,
} from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageLoading from '@/components/ui/page-loading';
import { formatPrice } from '@/lib/utils/format-price';
import { ensurePaystackReady } from '@/lib/paystack';
import { toast } from 'sonner';
import { GIFT_OCCASIONS, GIFT_RECIPIENTS } from '@/lib/gifts/discovery';
import { giftLeadCopy } from '@/lib/gifts/lead-copy';
import {
  trackGiftBeginCheckout,
  trackGiftByoStart,
  trackGiftPurchase,
} from '@/lib/analytics/gifts';
import { useGiftShippingQuote } from '@/hooks/use-gift-shipping-quote';
import { useLocationLgas } from '@/hooks/use-location-lgas';
import GiftPromoCode from '@/components/gifts/gift-promo-code';
import GiftDeliveryScheduleFields from '@/components/gifts/gift-delivery-schedule-fields';
import GiftBuilderCustomiseSheet from '@/components/gifts/gift-builder-customise-sheet';
import {
  GiftCheckoutSection,
  GiftPaymentMethodSection,
  GiftShippingMethodSection,
} from '@/components/gifts/gift-checkout-sections';
import { NIGERIAN_STATES } from '@/lib/constants/nigeria-states';
import { getEnabledPaymentGateways, type PaymentGateway } from '@/lib/woocommerce/shipping';
import type { GiftBuilderState, GiftPackagingOption } from '@/types/gifts';
import type { GiftVoucherResult } from '@/lib/gifts/voucher';

const SESSION_KEY = 'julinemart_gift_builder_token';
const STEPS = ['Who & occasion', 'Box size', 'Pick items', 'Checkout'] as const;

const SELECT_CLASS =
  'min-h-[44px] w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900';

type PoolProduct = {
  pool_id?: string;
  product_id?: string;
  sourced_id?: string;
  item_type?: 'vendor_catalog' | 'jlo_sourced';
  name: string;
  gift_category?: string | null;
  available_qty: number;
  image?: string | null;
  customisable?: boolean;
  customisation_schema_id?: string;
};

declare global {
  interface Window {
    PaystackPop: any;
  }
}

async function builderPost(body: Record<string, unknown>) {
  const res = await fetch('/api/gifts/builder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error || 'Request failed');
  const data = json.data;
  return {
    ...data,
    session_token: data.session_token || data.session?.session_token,
  } as GiftBuilderState & { session_token: string };
}

export default function GiftBuildPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [builder, setBuilder] = useState<GiftBuilderState | null>(null);
  const [pool, setPool] = useState<PoolProduct[]>([]);
  const [recipientType, setRecipientType] = useState('');
  const [occasion, setOccasion] = useState('');
  const [budget, setBudget] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [poolCategory, setPoolCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<GiftVoucherResult | null>(null);
  const [customiseTarget, setCustomiseTarget] = useState<PoolProduct | null>(null);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [checkout, setCheckout] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_address: '',
    recipient_city: '',
    recipient_state: '',
    recipient_zone: '',
    gift_message: '',
    sender_visible: true,
    requested_delivery_date: '',
    occasion_date: '',
  });

  const initSession = useCallback(async () => {
    setLoading(true);
    try {
      let token = localStorage.getItem(SESSION_KEY);

      if (token) {
        const res = await fetch(`/api/gifts/builder?session_token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (json.success && json.data?.session?.status === 'draft') {
          setBuilder(normalizeBuilder(json.data, token));
          setRecipientType(json.data.session?.recipient_type || '');
          setOccasion(json.data.session?.occasion || '');
          setBudget(json.data.session?.budget_max != null ? String(json.data.session.budget_max) : '');
          trackGiftByoStart({ resumed: true });
          return;
        }
        localStorage.removeItem(SESSION_KEY);
      }

      const created = await builderPost({ action: 'create', gfc_code: 'warri' });
      token = created.session_token;
      if (!token) throw new Error('No session token');

      localStorage.setItem(SESSION_KEY, token);
      trackGiftByoStart({ resumed: false });
      const res = await fetch(`/api/gifts/builder?session_token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load session');

      setBuilder(normalizeBuilder(json.data, token));
      setRecipientType(json.data.session?.recipient_type || '');
      setOccasion(json.data.session?.occasion || '');
      setBudget(json.data.session?.budget_max != null ? String(json.data.session.budget_max) : '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initSession().catch(() => {
      toast.error('Could not start gift builder');
      setLoading(false);
    });
    fetch('/api/gifts/pool?gfc=warri')
      .then((r) => r.json())
      .then((json) => setPool(json.data?.products || []))
      .catch(() => {});
  }, [initSession]);

  useEffect(() => {
    let cancelled = false;
    setPaymentLoading(true);
    getEnabledPaymentGateways()
      .then((gateways) => {
        if (cancelled) return;
        setPaymentGateways(gateways);
        if (gateways.length) setSelectedPayment(gateways[0].id);
      })
      .catch(() => {
        if (!cancelled) setPaymentGateways([]);
      })
      .finally(() => {
        if (!cancelled) setPaymentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const token = builder?.session_token;

  const saveContext = async () => {
    if (!token) return;
    const data = await builderPost({
      action: 'set_context',
      session_token: token,
      recipient_type: recipientType,
      occasion,
      budget_max: budget ? Number(budget) : null,
    });
    setBuilder(normalizeBuilder(data, token));
    setStep(1);
  };

  const selectPackaging = async (pkg: GiftPackagingOption) => {
    if (!token) return;
    try {
      const data = await builderPost({
        action: 'set_packaging',
        session_token: token,
        packaging_code: pkg.code,
      });
      setBuilder(normalizeBuilder(data, token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not select box size');
    }
  };

  const addProduct = async (
    product: PoolProduct,
    customisationSpec?: {
      schema_id: string;
      field_values: Record<string, string | number>;
      price_adjustment: number;
      summary_lines: string[];
    }
  ) => {
    if (!token) return;
    try {
      const body: Record<string, unknown> = {
        action: 'add_item',
        session_token: token,
        quantity: 1,
      };
      if (product.sourced_id || product.item_type === 'jlo_sourced') {
        body.pool_sourced_item_id = product.sourced_id || product.pool_id;
      } else if (product.product_id) {
        body.product_id = product.product_id;
        if (customisationSpec) body.customisation_spec = customisationSpec;
      } else {
        throw new Error('Invalid pool item');
      }
      const data = await builderPost(body);
      setBuilder(normalizeBuilder(data, token));
      toast.success('Added to box');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add item');
    }
  };

  const handlePoolTap = (product: PoolProduct) => {
    if (product.customisable && product.product_id) {
      setCustomiseTarget(product);
      return;
    }
    void addProduct(product);
  };

  const updateQty = async (itemId: string, quantity: number) => {
    if (!token || quantity < 1) return;
    try {
      const data = await builderPost({
        action: 'update_item',
        session_token: token,
        item_id: itemId,
        quantity,
      });
      setBuilder(normalizeBuilder(data, token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update');
    }
  };

  const removeItem = async (itemId: string) => {
    if (!token) return;
    const data = await builderPost({ action: 'remove_item', session_token: token, item_id: itemId });
    setBuilder(normalizeBuilder(data, token));
  };

  const shippingQuote = useGiftShippingQuote({
    deliveryState: checkout.recipient_state,
    deliveryCity: checkout.recipient_city,
    builderSessionToken: token || undefined,
    orderValue: builder?.totals.grand_total,
    enabled: step === 3 && Boolean(token),
  });

  const shippingFee = shippingQuote.shippingFee;

  // Recipient's area/LGA — same picker as regular checkout, sourced from the
  // Vendor Locations admin page. Falls back to free text for recipients
  // outside a hub-serviced city (gift boxes can ship anywhere in Nigeria).
  const lgaOptions = useLocationLgas(checkout.recipient_state, checkout.recipient_city);
  useEffect(() => {
    if (
      lgaOptions.length > 0 &&
      checkout.recipient_zone &&
      !lgaOptions.some((o) => o.lga === checkout.recipient_zone)
    ) {
      setCheckout((prev) => ({ ...prev, recipient_zone: '' }));
    }
  }, [lgaOptions, checkout.recipient_zone]);

  const voucherDiscount = appliedVoucher?.discount_amount ?? 0;
  const boxSubtotal = Math.max((builder?.totals.grand_total || 0) - voucherDiscount, 0);
  const grandTotal = boxSubtotal + (shippingFee ?? 0);
  const maxItems = builder?.packaging?.max_items ?? 12;
  const hasRecipientAddress = Boolean(
    checkout.recipient_city.trim() && checkout.recipient_state.trim()
  );

  const poolCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of pool) {
      if (p.gift_category) cats.add(p.gift_category);
    }
    return Array.from(cats).sort();
  }, [pool]);

  const filteredPool = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    return pool.filter((p) => {
      if (poolCategory && p.gift_category !== poolCategory) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [pool, poolSearch, poolCategory]);

  useEffect(() => {
    if (step !== 3 || !builder) return;
    trackGiftBeginCheckout({
      mode: 'build_your_own',
      value: grandTotal,
      itemCount: builder.items.length,
    });
  }, [step, builder, grandTotal]);

  const canCheckout = builder && builder.items.length > 0 && builder.packaging != null;
  const isCheckoutReady =
    Boolean(canCheckout) &&
    Boolean(selectedPayment) &&
    hasRecipientAddress &&
    shippingQuote.quotedShipping != null &&
    !shippingQuote.loading &&
    !shippingQuote.error &&
    Boolean(checkout.requested_delivery_date);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canCheckout) return;
    if (shippingQuote.quotedShipping == null) {
      toast.error(
        shippingQuote.error || 'Enter recipient city and state to calculate delivery'
      );
      return;
    }
    if (!checkout.requested_delivery_date) {
      toast.error('Choose a preferred delivery date');
      return;
    }
    if (!selectedPayment) {
      toast.error('Select a payment method');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/gifts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builder_session_token: token,
          gfc_code: 'warri',
          shipping_fee: shippingQuote.quotedShipping,
          voucher_code: appliedVoucher?.code,
          payment_method: selectedPayment,
          occasion: occasion || undefined,
          ...checkout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      localStorage.removeItem(SESSION_KEY);

      if (selectedPayment !== 'paystack') {
        toast.success('Gift order placed!');
        router.push(`/order-success?ref=${data.order_number || data.id}`);
        return;
      }

      await ensurePaystackReady();
      window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: checkout.customer_email,
        amount: Math.round(grandTotal * 100),
        ref: data.payment_reference || data.id,
        callback: () => {
          trackGiftPurchase({
            mode: 'build_your_own',
            transactionId: String(data.order_number || data.id),
            value: grandTotal,
            shipping: shippingQuote.quotedShipping ?? 0,
          });
          toast.success('Payment received!');
          router.push(`/order-success?ref=${data.order_number || data.id}`);
        },
        onClose: () => setSubmitting(false),
      }).openIframe();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 lg:pb-10">
      <div className="container-custom py-5 md:py-8">
        <PageHeader
          title="Build your own box"
          subtitle="Pick items, see your total, and send a personalised gift."
          backHref="/gifts"
        />

        <p className="mb-5 text-xs text-gray-500">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>

        <div className="mb-6 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={STEPS[i]} className="h-1 flex-1 rounded-full bg-gray-200">
              <div
                className={`h-full rounded-full transition-all ${i <= step ? 'bg-primary-600' : 'bg-transparent'}`}
                style={{ width: i <= step ? '100%' : '0%' }}
              />
            </div>
          ))}
        </div>

        <div
          className={
            step === 2
              ? 'lg:grid lg:grid-cols-[1fr_300px] lg:items-start lg:gap-8'
              : step === 3
                ? 'grid min-w-0 gap-6 lg:grid-cols-3'
                : ''
          }
        >
          <div className={step === 3 ? 'min-w-0 space-y-6 lg:col-span-2' : 'min-w-0 space-y-6'}>
            {step === 0 && (
              <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <BuildSelect
                    label="Who is this for?"
                    value={recipientType}
                    onChange={setRecipientType}
                    required
                  >
                    <option value="">Select recipient</option>
                    {GIFT_RECIPIENTS.map((r) => (
                      <option key={r.slug} value={r.label}>
                        {r.label}
                      </option>
                    ))}
                  </BuildSelect>

                  <BuildSelect label="Occasion" value={occasion} onChange={setOccasion}>
                    <option value="">Select occasion (optional)</option>
                    {GIFT_OCCASIONS.map((o) => (
                      <option key={o.slug} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </BuildSelect>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-500">
                    Budget cap (optional)
                  </span>
                  <Input
                    placeholder="e.g. 25000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>

                <Button className="w-full sm:w-auto sm:min-w-[200px]" onClick={saveContext} disabled={!recipientType}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </section>
            )}

            {step === 1 && builder && (
              <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                <div>
                  <h2 className="font-semibold text-gray-900">Choose box size</h2>
                  <p className="mt-1 text-sm text-gray-600">Box fee is added to your item total.</p>
                  {giftLeadCopy(builder.lead_time_days) ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4 shrink-0" />
                      {giftLeadCopy(builder.lead_time_days)}
                      {builder.items.length > 0
                        ? ''
                        : ' · slower items may add extra days'}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {(builder.packaging_options || []).map((pkg) => {
                    const selected = builder.packaging?.code === pkg.code;
                    return (
                      <button
                        key={pkg.code}
                        type="button"
                        onClick={() => selectPackaging(pkg)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          selected
                            ? 'border-primary-600 bg-primary-50/40 ring-1 ring-primary-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{pkg.name}</p>
                            {pkg.description ? (
                              <p className="mt-0.5 text-xs text-gray-500">{pkg.description}</p>
                            ) : null}
                            <p className="mt-2 text-xs text-gray-500">Up to {pkg.max_items} items</p>
                          </div>
                          <p className="shrink-0 font-bold text-primary-700">{formatPrice(pkg.price)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <StepNav
                  onBack={() => setStep(0)}
                  onNext={() => setStep(2)}
                  nextLabel="Pick items"
                  nextDisabled={!builder.packaging}
                />
              </section>
            )}

            {step === 2 && builder && (
              <>
                {builder.items.length > 0 && (
                  <section className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-gray-900">In your box</h2>
                      <p className="text-xs text-gray-500">
                        {builder.totals.item_count}/{maxItems} items
                      </p>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {builder.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{item.name}</p>
                            {item.customisation_summary?.length ? (
                              <p className="text-xs text-primary-700 line-clamp-2">
                                {item.customisation_summary.join(' · ')}
                              </p>
                            ) : null}
                            <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded-lg p-1.5 hover:bg-gray-100"
                              onClick={() => updateQty(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="w-6 text-center text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              className="rounded-lg p-1.5 hover:bg-gray-100"
                              onClick={() => updateQty(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="ml-1 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              onClick={() => removeItem(item.id)}
                              aria-label="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
                  <div>
                    <h2 className="font-semibold text-gray-900">Add items</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Tap to add. Your running total updates as you go.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <Input
                        className="pl-9"
                        placeholder="Search items…"
                        value={poolSearch}
                        onChange={(e) => setPoolSearch(e.target.value)}
                      />
                    </div>
                    {poolCategories.length > 0 && (
                      <BuildSelect
                        label="Category"
                        value={poolCategory}
                        onChange={setPoolCategory}
                        compact
                      >
                        <option value="">All categories</option>
                        {poolCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </BuildSelect>
                    )}
                  </div>

                  {filteredPool.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">
                      {pool.length === 0 ? 'No gift items available right now.' : 'No items match your search.'}
                    </p>
                  ) : (
                    <div className="grid max-h-[min(520px,60vh)] grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {filteredPool.map((p) => (
                        <button
                          key={p.product_id || p.sourced_id || p.name}
                          type="button"
                          onClick={() => handlePoolTap(p)}
                          disabled={builder.totals.item_count >= maxItems}
                          className="rounded-xl border border-gray-200 bg-white p-2 text-left hover:border-primary-300 disabled:opacity-50"
                        >
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.image}
                              alt=""
                              className="mb-2 aspect-square w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-gray-100">
                              <Gift className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          <p className="line-clamp-2 text-xs font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-500">
                            {p.customisable ? 'Personalise & add' : 'Tap to add'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  <StepNav
                    onBack={() => setStep(1)}
                    onNext={() => setStep(3)}
                    nextLabel="Checkout"
                    nextDisabled={!canCheckout}
                  />
                </section>
              </>
            )}

            {step === 3 && builder && (
              <form id="gift-build-checkout" onSubmit={handlePay} className="space-y-6">
                <div className="rounded-2xl bg-white p-4 shadow-sm lg:hidden">
                  <p className="flex items-center gap-2 font-semibold text-gray-900">
                    <Package className="h-4 w-4" /> Your box
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    {builder.packaging?.name} · {builder.totals.item_count} items
                  </p>
                  <p className="mt-2 font-bold text-primary-700">
                    {!hasRecipientAddress
                      ? formatPrice(boxSubtotal)
                      : shippingQuote.loading
                        ? 'Calculating delivery…'
                        : formatPrice(grandTotal)}
                  </p>
                </div>

                <GiftCheckoutSection
                  icon={<MapPin className="h-6 w-6 text-primary-600" />}
                  title="Contact Information"
                >
                  <div className="space-y-4">
                    <Input
                      label="Your full name *"
                      required
                      value={checkout.customer_name}
                      onChange={(e) => setCheckout({ ...checkout, customer_name: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Email address *"
                      type="email"
                      required
                      value={checkout.customer_email}
                      onChange={(e) => setCheckout({ ...checkout, customer_email: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Phone number *"
                      type="tel"
                      required
                      value={checkout.customer_phone}
                      onChange={(e) => setCheckout({ ...checkout, customer_phone: e.target.value })}
                      fullWidth
                    />
                  </div>
                </GiftCheckoutSection>

                <GiftCheckoutSection
                  icon={<MapPin className="h-6 w-6 text-primary-600" />}
                  title="Recipient & delivery"
                >
                  <div className="space-y-4">
                    <Input
                      label="Recipient name *"
                      required
                      value={checkout.recipient_name}
                      onChange={(e) => setCheckout({ ...checkout, recipient_name: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Recipient phone *"
                      required
                      value={checkout.recipient_phone}
                      onChange={(e) => setCheckout({ ...checkout, recipient_phone: e.target.value })}
                      fullWidth
                    />
                    <Input
                      label="Delivery address *"
                      required
                      value={checkout.recipient_address}
                      onChange={(e) => setCheckout({ ...checkout, recipient_address: e.target.value })}
                      fullWidth
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <Input
                        label="City *"
                        required
                        value={checkout.recipient_city}
                        onChange={(e) => setCheckout({ ...checkout, recipient_city: e.target.value })}
                        fullWidth
                      />
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">State *</label>
                        <select
                          required
                          value={checkout.recipient_state}
                          onChange={(e) => setCheckout({ ...checkout, recipient_state: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select state</option>
                          {NIGERIAN_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state === 'FCT' ? 'Federal Capital Territory (Abuja)' : state}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {lgaOptions.length > 0 ? (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Area / LGA *
                        </label>
                        <select
                          required
                          value={checkout.recipient_zone}
                          onChange={(e) => setCheckout({ ...checkout, recipient_zone: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select area</option>
                          {lgaOptions.map((o) => (
                            <option key={o.lga} value={o.lga}>
                              {o.lga}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-xs text-gray-500">
                          Helps us offer same-day local rider delivery where available.
                        </p>
                      </div>
                    ) : (
                      <Input
                        label="Delivery zone / area *"
                        required
                        value={checkout.recipient_zone}
                        onChange={(e) => setCheckout({ ...checkout, recipient_zone: e.target.value })}
                        fullWidth
                      />
                    )}
                  </div>
                </GiftCheckoutSection>

                <GiftShippingMethodSection
                  shippingFee={shippingQuote.quotedShipping}
                  loading={shippingQuote.loading}
                  error={shippingQuote.error}
                  hasAddress={hasRecipientAddress}
                />

                <GiftPromoCode
                  customerEmail={checkout.customer_email}
                  orderSubtotal={builder.totals.grand_total}
                  builderSessionToken={token || undefined}
                  occasion={occasion || undefined}
                  applied={appliedVoucher}
                  onApplied={setAppliedVoucher}
                  onRemoved={() => setAppliedVoucher(null)}
                />

                <GiftDeliveryScheduleFields
                  builderSessionToken={token || undefined}
                  requestedDeliveryDate={checkout.requested_delivery_date}
                  occasionDate={checkout.occasion_date}
                  onRequestedDeliveryDateChange={(v) =>
                    setCheckout({ ...checkout, requested_delivery_date: v })
                  }
                  onOccasionDateChange={(v) => setCheckout({ ...checkout, occasion_date: v })}
                  enabled={Boolean(token)}
                />

                <GiftCheckoutSection icon={<Heart className="h-5 w-5 text-rose-500" />} title="Gift message">
                  <div className="space-y-3">
                    <textarea
                      className="min-h-[100px] w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Write a personal message for the card…"
                      value={checkout.gift_message}
                      onChange={(e) => setCheckout({ ...checkout, gift_message: e.target.value })}
                      maxLength={500}
                    />
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checkout.sender_visible}
                        onChange={(e) => setCheckout({ ...checkout, sender_visible: e.target.checked })}
                        className="h-4 w-4 text-primary-600"
                      />
                      Show my name on the gift card
                    </label>
                  </div>
                </GiftCheckoutSection>

                <GiftPaymentMethodSection
                  gateways={paymentGateways}
                  selectedPayment={selectedPayment}
                  onSelect={setSelectedPayment}
                  loading={paymentLoading}
                />

                <div className="hidden lg:block">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Back to items
                  </Button>
                </div>
              </form>
            )}
          </div>

          {step === 2 && builder && (
            <aside className="sticky top-24 hidden space-y-4 lg:block">
              <BoxSummary
                builder={builder}
                maxItems={maxItems}
                action={
                  <Button className="w-full" disabled={!canCheckout} onClick={() => setStep(3)}>
                    Continue to checkout
                  </Button>
                }
              />
            </aside>
          )}

          {step === 3 && builder && (
            <aside className="min-w-0 lg:col-span-1">
              <div className="sticky top-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">
                <p className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                  <Package className="h-4 w-4" /> Order summary
                </p>
                <p className="text-sm text-gray-600">
                  {builder.packaging?.name} · {builder.totals.item_count} items
                </p>
                <div className="mt-4 space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items + box</span>
                    <span className="font-medium">{formatPrice(builder.totals.grand_total)}</span>
                  </div>
                  {voucherDiscount > 0 ? (
                    <div className="flex justify-between text-green-600">
                      <span>Voucher</span>
                      <span className="font-medium">−{formatPrice(voucherDiscount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-medium">
                      {!hasRecipientAddress
                        ? 'Enter city & state'
                        : shippingQuote.loading
                          ? 'Calculating…'
                          : shippingQuote.error
                            ? '—'
                            : formatPrice(shippingFee ?? 0)}
                    </span>
                  </div>
                  {shippingQuote.error ? (
                    <p className="text-xs text-amber-700">{shippingQuote.error}</p>
                  ) : null}
                  <div className="flex justify-between border-t pt-3 text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary-600">{formatPrice(grandTotal)}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  form="gift-build-checkout"
                  className="mt-5 hidden h-12 w-full lg:inline-flex"
                  disabled={submitting || !isCheckoutReady}
                >
                  {submitting ? 'Opening payment…' : `Pay ${formatPrice(grandTotal)}`}
                </Button>
              </div>
            </aside>
          )}
        </div>
      </div>

      {builder && step === 3 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-4 shadow-lg lg:hidden">
          <div className="container-custom flex items-center gap-3">
            <button
              type="button"
              className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"
              onClick={() => setStep(2)}
            >
              Back
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-lg font-bold text-primary-700">{formatPrice(grandTotal)}</p>
            </div>
            <Button
              type="submit"
              form="gift-build-checkout"
              className="min-h-[44px] shrink-0 px-6"
              disabled={submitting || !isCheckoutReady}
            >
              {submitting ? 'Paying…' : 'Pay now'}
            </Button>
          </div>
        </div>
      )}

      {builder && step >= 1 && step < 3 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-4 shadow-lg lg:hidden">
          <div className="container-custom flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-500">Running total</p>
              <p className="text-lg font-bold text-primary-700">{formatPrice(builder.totals.grand_total)}</p>
            </div>
            <div className="text-right text-xs text-gray-500">
              {builder.packaging ? <p>{builder.packaging.name}</p> : null}
              <p>
                {builder.totals.item_count}/{maxItems} items
              </p>
            </div>
          </div>
        </div>
      )}

      <GiftBuilderCustomiseSheet
        productId={customiseTarget?.product_id || ''}
        productName={customiseTarget?.name || ''}
        open={Boolean(customiseTarget)}
        onClose={() => setCustomiseTarget(null)}
        onConfirm={(spec) => {
          if (customiseTarget) void addProduct(customiseTarget, spec);
          setCustomiseTarget(null);
        }}
      />
    </main>
  );
}

function BoxSummary({
  builder,
  maxItems,
  action,
}: {
  builder: GiftBuilderState;
  maxItems: number;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your box</p>
      <p className="mt-1 text-2xl font-bold text-primary-700">{formatPrice(builder.totals.grand_total)}</p>
      <p className="mt-1 text-sm text-gray-600">
        {builder.totals.item_count}/{maxItems} items
        {builder.packaging ? ` · ${builder.packaging.name}` : ''}
      </p>
      {giftLeadCopy(builder.lead_time_days) ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          {giftLeadCopy(builder.lead_time_days)}
        </p>
      ) : null}
      {builder.items.length > 0 && (
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto border-t pt-4 text-sm">
          {builder.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="truncate text-gray-700">{item.name}</span>
              <span className="shrink-0 text-gray-500">×{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}
      {action}
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 border-t border-gray-100 pt-4">
      <Button type="button" variant="outline" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>
      <Button type="button" className="flex-1 sm:flex-none" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

function BuildSelect({
  label,
  value,
  onChange,
  children,
  required,
  compact,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  required?: boolean;
  compact?: boolean;
}) {
  return (
    <label className={`block min-w-0 ${compact ? 'sm:w-44' : ''}`}>
      <span className="mb-1 block text-xs font-medium text-gray-500">
        {label}
        {required ? ' *' : ''}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLASS}
          aria-label={label}
          required={required}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </label>
  );
}

function normalizeBuilder(data: Partial<GiftBuilderState>, token: string): GiftBuilderState {
  return {
    session_token: token,
    items: data.items || [],
    packaging: data.packaging || null,
    packaging_options: data.packaging_options || [],
    totals: data.totals || { items_subtotal: 0, packaging_fee: 0, grand_total: 0, item_count: 0 },
    session: data.session || {},
    byo_lead_time_days: data.byo_lead_time_days,
    lead_time_days: data.lead_time_days,
  };
}
