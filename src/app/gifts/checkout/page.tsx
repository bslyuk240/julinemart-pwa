'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Gift, Heart } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageLoading from '@/components/ui/page-loading';
import { formatPrice } from '@/lib/utils/format-price';
import { ensurePaystackReady } from '@/lib/paystack';
import { toast } from 'sonner';
import { trackGiftBeginCheckout, trackGiftPurchase } from '@/lib/analytics/gifts';
import { useGiftShippingQuote } from '@/hooks/use-gift-shipping-quote';
import GiftPromoCode from '@/components/gifts/gift-promo-code';
import GiftDeliveryScheduleFields from '@/components/gifts/gift-delivery-schedule-fields';
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

  const { shippingFee, loading: shippingLoading, error: shippingError, quotedShipping } =
    useGiftShippingQuote({
      deliveryState: form.recipient_state,
      deliveryCity: form.recipient_city,
      giftBoxSlug: boxSlug,
      orderValue: box?.list_price,
      enabled: Boolean(box),
    });

  const voucherDiscount = appliedVoucher?.discount_amount ?? 0;
  const discountedSubtotal = Math.max((box?.list_price || 0) - voucherDiscount, 0);
  const total = discountedSubtotal + (shippingFee ?? 0);

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
          ...form,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create gift order');

      await ensurePaystackReady();
      const amountKobo = Math.round(total * 100);
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
        <p className="text-gray-600 mb-4">Choose a gift box first.</p>
        <Link href="/gifts" className="text-primary-600 font-medium">
          Browse gift boxes
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
      <div className="space-y-6">
      <div className="bg-white rounded-2xl border p-4 flex gap-4 items-center lg:hidden">
        <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Gift className="w-7 h-7 text-primary-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">{box.name}</p>
          <p className="text-sm text-gray-600">{box.item_count} curated items</p>
        </div>
        <p className="font-bold text-primary-700">{formatPrice(box.list_price)}</p>
      </div>

      <section className="bg-white rounded-2xl border p-4 md:p-5 space-y-3">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" /> Your details (sender)
        </h2>
        <Input placeholder="Your full name" required value={form.customer_name} onChange={(e) => update('customer_name', e.target.value)} />
        <Input type="email" placeholder="Your email" required value={form.customer_email} onChange={(e) => update('customer_email', e.target.value)} />
        <Input placeholder="Your phone" required value={form.customer_phone} onChange={(e) => update('customer_phone', e.target.value)} />
      </section>

      <GiftPromoCode
        customerEmail={form.customer_email}
        orderSubtotal={box.list_price}
        giftBoxSlug={boxSlug}
        applied={appliedVoucher}
        onApplied={setAppliedVoucher}
        onRemoved={() => setAppliedVoucher(null)}
      />

      <section className="bg-white rounded-2xl border p-4 md:p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Recipient & delivery</h2>
        <Input placeholder="Recipient name" required value={form.recipient_name} onChange={(e) => update('recipient_name', e.target.value)} />
        <Input placeholder="Recipient phone" required value={form.recipient_phone} onChange={(e) => update('recipient_phone', e.target.value)} />
        <Input placeholder="Recipient email (optional)" value={form.recipient_email} onChange={(e) => update('recipient_email', e.target.value)} />
        <Input placeholder="Delivery address" required value={form.recipient_address} onChange={(e) => update('recipient_address', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="City" required value={form.recipient_city} onChange={(e) => update('recipient_city', e.target.value)} />
          <Input placeholder="State" required value={form.recipient_state} onChange={(e) => update('recipient_state', e.target.value)} />
        </div>
        <Input placeholder="Delivery zone / area" required value={form.recipient_zone} onChange={(e) => update('recipient_zone', e.target.value)} />
      </section>

      <GiftDeliveryScheduleFields
        giftBoxSlug={boxSlug}
        requestedDeliveryDate={form.requested_delivery_date}
        occasionDate={form.occasion_date}
        onRequestedDeliveryDateChange={(v) => update('requested_delivery_date', v)}
        onOccasionDateChange={(v) => update('occasion_date', v)}
        enabled={Boolean(box)}
      />

      <section className="bg-white rounded-2xl border p-4 md:p-5 space-y-3">
        <h2 className="font-semibold text-gray-900">Gift message</h2>
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
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
          />
          Show my name on the gift card
        </label>
        <Input placeholder="Occasion (optional) e.g. Birthday" value={form.occasion} onChange={(e) => update('occasion', e.target.value)} />
      </section>

      <div className="lg:hidden bg-white rounded-2xl border p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Gift box</span>
          <span>{formatPrice(box.list_price)}</span>
        </div>
        {voucherDiscount > 0 ? (
          <div className="flex justify-between text-green-700">
            <span>Voucher</span>
            <span>−{formatPrice(voucherDiscount)}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>
            {shippingLoading
              ? 'Calculating…'
              : shippingError
                ? '—'
                : formatPrice(shippingFee ?? 0)}
          </span>
        </div>
        {shippingError ? (
          <p className="text-xs text-amber-700">{shippingError}</p>
        ) : null}
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total</span>
          <span className="text-primary-700">{formatPrice(total)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full h-12 lg:hidden" disabled={submitting || shippingLoading || quotedShipping == null}>
        {submitting ? 'Opening payment…' : `Pay ${formatPrice(total)}`}
      </Button>
      </div>

      <aside className="hidden lg:block sticky top-24 space-y-4">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex gap-4 items-start mb-4">
            <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Gift className="w-7 h-7 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{box.name}</p>
              <p className="text-sm text-gray-600">{box.item_count} curated items</p>
            </div>
          </div>
          <div className="space-y-2 text-sm border-t pt-4">
            <div className="flex justify-between">
              <span>Gift box</span>
              <span>{formatPrice(box.list_price)}</span>
            </div>
            {voucherDiscount > 0 ? (
              <div className="flex justify-between text-green-700">
                <span>Voucher</span>
                <span>−{formatPrice(voucherDiscount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>
                {shippingLoading
                  ? 'Calculating…'
                  : shippingError
                    ? '—'
                    : formatPrice(shippingFee ?? 0)}
              </span>
            </div>
            {shippingError ? (
              <p className="text-xs text-amber-700">{shippingError}</p>
            ) : null}
            <div className="flex justify-between font-bold text-lg pt-3 border-t">
              <span>Total</span>
              <span className="text-primary-700">{formatPrice(total)}</span>
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-12 mt-5"
            disabled={submitting || shippingLoading || quotedShipping == null}
          >
            {submitting ? 'Opening payment…' : `Pay ${formatPrice(total)}`}
          </Button>
        </div>
      </aside>
    </form>
  );
}

export default function GiftCheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container-custom py-5 md:py-8 max-w-6xl">
        <PageHeader title="Gift checkout" backHref="/gifts" />
        <Suspense fallback={<PageLoading />}>
          <GiftCheckoutForm />
        </Suspense>
      </div>
    </main>
  );
}
