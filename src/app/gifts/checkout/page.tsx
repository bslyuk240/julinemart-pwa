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
import type { GiftBox } from '@/types/gifts';

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

function GiftCheckoutForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boxSlug = searchParams.get('box') || '';

  const [box, setBox] = useState<GiftBox | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const shippingFee = 2500;
  const total = (box?.list_price || 0) + shippingFee;

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!box) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/gifts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gift_box_slug: box.slug,
          gfc_code: 'warri',
          shipping_fee: shippingFee,
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
        amount: amountKobo,
        ref: reference,
        metadata: {
          order_id: data.id,
          custom_fields: [
            { display_name: 'Gift box', variable_name: 'gift_box', value: box.name },
            { display_name: 'Recipient', variable_name: 'recipient', value: form.recipient_name },
          ],
        },
        callback: () => {
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-2xl border p-4 flex gap-4 items-center">
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

      <div className="bg-white rounded-2xl border p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Gift box</span>
          <span>{formatPrice(box.list_price)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{formatPrice(shippingFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total</span>
          <span className="text-primary-700">{formatPrice(total)}</span>
        </div>
      </div>

      <Button type="submit" className="w-full h-12" disabled={submitting}>
        {submitting ? 'Opening payment…' : `Pay ${formatPrice(total)}`}
      </Button>
    </form>
  );
}

export default function GiftCheckoutPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      <div className="container-custom py-5 md:py-8 max-w-lg">
        <PageHeader title="Gift checkout" backHref="/gifts" />
        <Suspense fallback={<PageLoading />}>
          <GiftCheckoutForm />
        </Suspense>
      </div>
    </main>
  );
}
