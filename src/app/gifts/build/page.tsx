'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gift,
  Package,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageLoading from '@/components/ui/page-loading';
import { formatPrice } from '@/lib/utils/format-price';
import { ensurePaystackReady } from '@/lib/paystack';
import { toast } from 'sonner';
import type { GiftBuilderState, GiftPackagingOption } from '@/types/gifts';

const SESSION_KEY = 'julinemart_gift_builder_token';
const STEPS = ['Who & occasion', 'Box tier', 'Pick items', 'Checkout'] as const;
const RECIPIENTS = ['Friend', 'Partner', 'Mum', 'Dad', 'Colleague', 'Other'];
const OCCASIONS = ['Birthday', 'Thank you', 'Anniversary', 'Congratulations', 'Just because'];

type PoolProduct = {
  product_id: string;
  name: string;
  price: number;
  gift_category?: string | null;
  available_qty: number;
  image?: string | null;
};

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
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
  const [submitting, setSubmitting] = useState(false);
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
          return;
        }
        localStorage.removeItem(SESSION_KEY);
      }

      const created = await builderPost({ action: 'create', gfc_code: 'warri' });
      token = created.session_token;
      if (!token) throw new Error('No session token');

      localStorage.setItem(SESSION_KEY, token);
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
      toast.error(err instanceof Error ? err.message : 'Could not select tier');
    }
  };

  const addProduct = async (product: PoolProduct) => {
    if (!token) return;
    try {
      const data = await builderPost({
        action: 'add_item',
        session_token: token,
        product_id: product.product_id,
        quantity: 1,
      });
      setBuilder(normalizeBuilder(data, token));
      toast.success('Added to box');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add item');
    }
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

  const shippingFee = 2500;
  const grandTotal = (builder?.totals.grand_total || 0) + shippingFee;

  const canCheckout =
    builder &&
    builder.items.length > 0 &&
    builder.packaging != null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !canCheckout) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/gifts/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          builder_session_token: token,
          gfc_code: 'warri',
          shipping_fee: shippingFee,
          occasion: occasion || undefined,
          ...checkout,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      localStorage.removeItem(SESSION_KEY);
      await ensurePaystackReady();
      window.PaystackPop.setup({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
        email: checkout.customer_email,
        amount: Math.round(grandTotal * 100),
        ref: data.payment_reference || data.id,
        callback: () => {
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

  const maxItems = builder?.packaging?.max_items ?? 12;

  if (loading) return <PageLoading />;

  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      <div className="container-custom py-5 max-w-lg">
        <PageHeader title="Build your gift box" backHref="/gifts" />

        <div className="flex gap-1 mb-6">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-primary-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Who is this gift for?</h2>
            <div className="flex flex-wrap gap-2">
              {RECIPIENTS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecipientType(r)}
                  className={`px-3 py-2 rounded-full text-sm border ${
                    recipientType === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <h2 className="font-semibold text-gray-900 pt-2">Occasion</h2>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOccasion(o)}
                  className={`px-3 py-2 rounded-full text-sm border ${
                    occasion === o ? 'bg-rose-600 text-white border-rose-600' : 'bg-white'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            <Input
              placeholder="Budget cap (optional) ₦"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
            />
            <Button className="w-full" onClick={saveContext} disabled={!recipientType}>
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 1 && builder && (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-900">Choose your box</h2>
            {(builder.packaging_options || []).map((pkg) => (
              <button
                key={pkg.code}
                type="button"
                onClick={() => selectPackaging(pkg)}
                className={`w-full text-left bg-white border rounded-xl p-4 ${
                  builder.packaging?.code === pkg.code ? 'border-primary-600 ring-2 ring-primary-100' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-xs text-gray-500">{pkg.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Up to {pkg.max_items} items</p>
                  </div>
                  <p className="font-bold text-primary-700">{formatPrice(pkg.price)}</p>
                </div>
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" disabled={!builder.packaging} onClick={() => setStep(2)}>
                Pick items
              </Button>
            </div>
          </div>
        )}

        {step === 2 && builder && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              {builder.totals.item_count}/{maxItems} items · Pool only (Warri hub)
            </p>
            {builder.items.length > 0 && (
              <ul className="bg-white border rounded-xl divide-y">
                {builder.items.map((item) => (
                  <li key={item.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">{formatPrice(item.line_total)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" className="p-1" onClick={() => updateQty(item.id, item.quantity - 1)}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-6 text-center text-sm">{item.quantity}</span>
                      <button type="button" className="p-1" onClick={() => updateQty(item.id, item.quantity + 1)}>
                        <Plus className="w-4 h-4" />
                      </button>
                      <button type="button" className="p-1 text-red-500 ml-1" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {pool.map((p) => (
                <button
                  key={p.product_id}
                  type="button"
                  onClick={() => addProduct(p)}
                  disabled={builder.totals.item_count >= maxItems}
                  className="bg-white border rounded-xl p-2 text-left hover:border-primary-300 disabled:opacity-50"
                >
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="w-full aspect-square object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                      <Gift className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                  <p className="text-xs text-primary-700 font-semibold">{formatPrice(p.price)}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" disabled={!canCheckout} onClick={() => setStep(3)}>
                Checkout
              </Button>
            </div>
          </div>
        )}

        {step === 3 && builder && (
          <form onSubmit={handlePay} className="space-y-4">
            <div className="bg-white border rounded-xl p-4 text-sm space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <Package className="w-4 h-4" /> Your box
              </p>
              <p>{builder.packaging?.name} · {builder.totals.item_count} items</p>
              <p className="font-bold text-primary-700 pt-1">{formatPrice(grandTotal)} incl. delivery</p>
            </div>
            <Input placeholder="Your name" required value={checkout.customer_name} onChange={(e) => setCheckout({ ...checkout, customer_name: e.target.value })} />
            <Input type="email" placeholder="Your email" required value={checkout.customer_email} onChange={(e) => setCheckout({ ...checkout, customer_email: e.target.value })} />
            <Input placeholder="Your phone" required value={checkout.customer_phone} onChange={(e) => setCheckout({ ...checkout, customer_phone: e.target.value })} />
            <Input placeholder="Recipient name" required value={checkout.recipient_name} onChange={(e) => setCheckout({ ...checkout, recipient_name: e.target.value })} />
            <Input placeholder="Recipient phone" required value={checkout.recipient_phone} onChange={(e) => setCheckout({ ...checkout, recipient_phone: e.target.value })} />
            <Input placeholder="Delivery address" required value={checkout.recipient_address} onChange={(e) => setCheckout({ ...checkout, recipient_address: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="City" required value={checkout.recipient_city} onChange={(e) => setCheckout({ ...checkout, recipient_city: e.target.value })} />
              <Input placeholder="State" required value={checkout.recipient_state} onChange={(e) => setCheckout({ ...checkout, recipient_state: e.target.value })} />
            </div>
            <Input placeholder="Delivery zone" required value={checkout.recipient_zone} onChange={(e) => setCheckout({ ...checkout, recipient_zone: e.target.value })} />
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              placeholder="Gift message"
              value={checkout.gift_message}
              onChange={(e) => setCheckout({ ...checkout, gift_message: e.target.value })}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? 'Opening payment…' : `Pay ${formatPrice(grandTotal)}`}
              </Button>
            </div>
          </form>
        )}
      </div>

      {builder && step >= 1 && step < 3 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-4 z-20">
          <div className="container-custom max-w-lg flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Running total</p>
              <p className="text-lg font-bold text-primary-700">{formatPrice(builder.totals.grand_total)}</p>
            </div>
            {builder.packaging && (
              <p className="text-xs text-gray-500">{builder.packaging.name}</p>
            )}
          </div>
        </div>
      )}
    </main>
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
  };
}
