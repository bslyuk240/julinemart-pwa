'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Gift, Heart, MapPin } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageLoading from '@/components/ui/page-loading';
import { formatPrice } from '@/lib/utils/format-price';
import { ensurePaystackReady } from '@/lib/paystack';
import { toast } from 'sonner';
import { trackGiftBeginCheckout, trackGiftPurchase } from '@/lib/analytics/gifts';
import { useGiftShippingQuote } from '@/hooks/use-gift-shipping-quote';
import { useLocationLgas } from '@/hooks/use-location-lgas';
import GiftPromoCode from '@/components/gifts/gift-promo-code';
import GiftDeliveryScheduleFields from '@/components/gifts/gift-delivery-schedule-fields';
import {
  GiftPaymentMethodSection,
  GiftShippingMethodSection,
  GiftCheckoutSection,
} from '@/components/gifts/gift-checkout-sections';
import { NIGERIAN_STATES } from '@/lib/constants/nigeria-states';
import { getEnabledPaymentGateways, type PaymentGateway } from '@/lib/woocommerce/shipping';
import type { GiftBox } from '@/types/gifts';
import type { GiftVoucherResult } from '@/lib/gifts/voucher';

declare global {
  interface Window {
    PaystackPop: any;
  }
}

function GiftCheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxSlug = searchParams.get('box') || '';

  const [box, setBox] = useState<GiftBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<GiftVoucherResult | null>(null);
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [selectedPayment, setSelectedPayment] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(true);

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    recipient_address: '',
    recipient_city: '',
    recipient_state: '',
    recipient_zone: '',
    gift_message: '',
    sender_visible: true,
    occasion: '',
    requested_delivery_date: '',
    occasion_date: '',
  });

  useEffect(() => {
    if (!boxSlug) {
      setLoading(false);
      return;
    }
    fetch(`/api/gifts/boxes?gfc=warri&slug=${encodeURIComponent(boxSlug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setBox(json.data);
      })
      .finally(() => setLoading(false));
  }, [boxSlug]);

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

  const { shippingFee, loading: shippingLoading, error: shippingError, quotedShipping } =
    useGiftShippingQuote({
      deliveryState: form.recipient_state,
      deliveryCity: form.recipient_city,
      giftBoxSlug: boxSlug,
      orderValue: box?.list_price,
      enabled: Boolean(box),
    });

  // Recipient's area/LGA — same picker as regular checkout, sourced from the
  // Vendor Locations admin page. Falls back to free text for recipients
  // outside a hub-serviced city (gift boxes can ship anywhere in Nigeria).
  const lgaOptions = useLocationLgas(form.recipient_state, form.recipient_city);
  // Unlike regular checkout's optional picker, this field stays required and
  // falls back to free text when the city isn't hub-serviced — only clear a
  // stale selection when we're actually in dropdown mode (lgaOptions.length
  // > 0); otherwise the field is free text and every keystroke would get
  // wiped by this effect.
  useEffect(() => {
    if (
      lgaOptions.length > 0 &&
      form.recipient_zone &&
      !lgaOptions.some((o) => o.lga === form.recipient_zone)
    ) {
      setForm((prev) => ({ ...prev, recipient_zone: '' }));
    }
  }, [lgaOptions, form.recipient_zone]);

  const voucherDiscount = appliedVoucher?.discount_amount ?? 0;
  const discountedSubtotal = Math.max((box?.list_price || 0) - voucherDiscount, 0);
  const total = discountedSubtotal + (shippingFee ?? 0);
  const hasRecipientAddress = Boolean(form.recipient_city.trim() && form.recipient_state.trim());

  useEffect(() => {
    if (!box) return;
    trackGiftBeginCheckout({
      mode: 'ready_made',
      value: total,
      boxSlug: box.slug,
      boxName: box.name,
      itemCount: box.item_count,
    });
  }, [box, total]);

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isCheckoutReady =
    Boolean(box) &&
    Boolean(selectedPayment) &&
    hasRecipientAddress &&
    quotedShipping != null &&
    !shippingLoading &&
    !shippingError &&
    Boolean(form.requested_delivery_date);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!box || shippingFee == null || quotedShipping == null) {
      if (form.recipient_state && form.recipient_city) {
        toast.error(shippingError || 'Enter a valid delivery address to see delivery fee');
      } else {
        toast.error('Enter recipient city and state for delivery quote');
      }
      return;
    }
    if (!form.requested_delivery_date) {
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
          gift_box_slug: box.slug,
          gfc_code: 'warri',
          shipping_fee: quotedShipping,
          voucher_code: appliedVoucher?.code,
          payment_method: selectedPayment,
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create gift order');

      if (selectedPayment !== 'paystack') {
        toast.success('Gift order placed!');
        router.push(`/order-success?ref=${data.order_number || data.id}`);
        return;
      }

      await ensurePaystackReady();
      const reference = data.payment_reference || data.id;

      window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: form.customer_email,
        amount: Math.round(total * 100),
        ref: reference,
        metadata: {
          order_id: data.id,
          custom_fields: [
            { display_name: 'Gift box', variable_name: 'gift_box', value: box.name },
            { display_name: 'Recipient', variable_name: 'recipient', value: form.recipient_name },
          ],
        },
        callback: () => {
          trackGiftPurchase({
            mode: 'ready_made',
            transactionId: String(data.order_number || data.id),
            value: total,
            shipping: quotedShipping ?? 0,
            boxSlug: box.slug,
            boxName: box.name,
          });
          toast.success('Payment received!');
          router.push(`/order-success?ref=${data.order_number || data.id}`);
        },
        onClose: () => {
          toast.message('Payment window closed — your gift order is saved as pending.');
          setSubmitting(false);
        },
      }).openIframe();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoading />;

  if (!boxSlug || !box) {
    return (
      <div className="container-custom py-10 text-center">
        <p className="mb-4 text-gray-600">Choose a gift box first.</p>
        <Link href="/gifts" className="font-medium text-primary-600">
          Browse gift boxes
        </Link>
      </div>
    );
  }

  const orderSummary = (
    <>
      <div className="mb-4 flex gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Gift className="h-7 w-7 text-primary-600" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{box.name}</p>
          <p className="text-sm text-gray-600">{box.item_count} curated items</p>
        </div>
      </div>

      <div className="space-y-2 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Gift box</span>
          <span className="font-medium">{formatPrice(box.list_price)}</span>
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
              : shippingLoading
                ? 'Calculating…'
                : shippingError
                  ? '—'
                  : formatPrice(shippingFee ?? 0)}
          </span>
        </div>
        <div className="flex justify-between border-t pt-3 text-lg font-bold">
          <span>Total</span>
          <span className="text-primary-600">
            {shippingFee == null && hasRecipientAddress && !shippingLoading ? '—' : formatPrice(total)}
          </span>
        </div>
      </div>

      <Button
        type="submit"
        className="mt-5 hidden h-12 w-full lg:inline-flex"
        disabled={submitting || !isCheckoutReady}
      >
        {submitting ? 'Opening payment…' : `Pay ${formatPrice(total)}`}
      </Button>
    </>
  );

  return (
    <>
    <form id="gift-ready-checkout" onSubmit={handleSubmit}>
      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <GiftCheckoutSection
            icon={<MapPin className="h-6 w-6 text-primary-600" />}
            title="Contact Information"
          >
            <div className="space-y-4">
              <Input
                label="Your full name *"
                required
                value={form.customer_name}
                onChange={(e) => update('customer_name', e.target.value)}
                fullWidth
              />
              <Input
                label="Email address *"
                type="email"
                required
                value={form.customer_email}
                onChange={(e) => update('customer_email', e.target.value)}
                fullWidth
              />
              <Input
                label="Phone number *"
                type="tel"
                required
                value={form.customer_phone}
                onChange={(e) => update('customer_phone', e.target.value)}
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
                value={form.recipient_name}
                onChange={(e) => update('recipient_name', e.target.value)}
                fullWidth
              />
              <Input
                label="Recipient phone *"
                required
                value={form.recipient_phone}
                onChange={(e) => update('recipient_phone', e.target.value)}
                fullWidth
              />
              <Input
                label="Recipient email (optional)"
                type="email"
                value={form.recipient_email}
                onChange={(e) => update('recipient_email', e.target.value)}
                fullWidth
              />
              <Input
                label="Delivery address *"
                required
                value={form.recipient_address}
                onChange={(e) => update('recipient_address', e.target.value)}
                fullWidth
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="City *"
                  required
                  value={form.recipient_city}
                  onChange={(e) => update('recipient_city', e.target.value)}
                  fullWidth
                />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">State *</label>
                  <select
                    required
                    value={form.recipient_state}
                    onChange={(e) => update('recipient_state', e.target.value)}
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
                    value={form.recipient_zone}
                    onChange={(e) => update('recipient_zone', e.target.value)}
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
                  value={form.recipient_zone}
                  onChange={(e) => update('recipient_zone', e.target.value)}
                  fullWidth
                />
              )}
            </div>
          </GiftCheckoutSection>

          <GiftShippingMethodSection
            shippingFee={quotedShipping}
            loading={shippingLoading}
            error={shippingError}
            hasAddress={hasRecipientAddress}
          />

          <GiftPromoCode
            customerEmail={form.customer_email}
            orderSubtotal={box.list_price}
            giftBoxSlug={boxSlug}
            occasion={form.occasion}
            applied={appliedVoucher}
            onApplied={setAppliedVoucher}
            onRemoved={() => setAppliedVoucher(null)}
          />

          <GiftDeliveryScheduleFields
            giftBoxSlug={boxSlug}
            requestedDeliveryDate={form.requested_delivery_date}
            occasionDate={form.occasion_date}
            onRequestedDeliveryDateChange={(v) => update('requested_delivery_date', v)}
            onOccasionDateChange={(v) => update('occasion_date', v)}
            enabled={Boolean(box)}
          />

          <GiftCheckoutSection icon={<Heart className="h-5 w-5 text-rose-500" />} title="Gift message">
            <div className="space-y-3">
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Write a personal message for the card…"
                value={form.gift_message}
                onChange={(e) => update('gift_message', e.target.value)}
                maxLength={500}
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.sender_visible}
                  onChange={(e) => update('sender_visible', e.target.checked)}
                  className="h-4 w-4 text-primary-600"
                />
                Show my name on the gift card
              </label>
              <Input
                label="Occasion (optional)"
                placeholder="e.g. Birthday"
                value={form.occasion}
                onChange={(e) => update('occasion', e.target.value)}
                fullWidth
              />
            </div>
          </GiftCheckoutSection>

          <GiftPaymentMethodSection
            gateways={paymentGateways}
            selectedPayment={selectedPayment}
            onSelect={setSelectedPayment}
            loading={paymentLoading}
          />
        </div>

        <div className="min-w-0 lg:col-span-1">
          <div className="sticky top-4 rounded-2xl bg-white p-4 shadow-sm md:p-5">{orderSummary}</div>
        </div>
      </div>
    </form>

    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white p-4 shadow-lg lg:hidden">
      <div className="container-custom flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-lg font-bold text-primary-700">
            {shippingFee == null && hasRecipientAddress && !shippingLoading ? '—' : formatPrice(total)}
          </p>
        </div>
        <Button
          type="submit"
          form="gift-ready-checkout"
          className="min-h-[44px] shrink-0 px-6"
          disabled={submitting || !isCheckoutReady}
        >
          {submitting ? 'Paying…' : 'Pay now'}
        </Button>
      </div>
    </div>
    </>
  );
}

export default function GiftCheckoutPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom min-w-0 py-5 md:py-6">
        <PageHeader
          title="Gift checkout"
          subtitle="Review your details and complete your gift order"
          backHref="/gifts"
          backLabel="Back to gifts"
        />
        <Suspense fallback={<PageLoading />}>
          <GiftCheckoutForm />
        </Suspense>
      </div>
    </main>
  );
}
