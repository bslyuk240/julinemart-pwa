'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Gift } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export const GIFT_STATUS_LABELS: Record<string, string> = {
  new: 'Order placed',
  paid: 'Payment confirmed',
  packing: 'Being packed with care',
  packed: 'Gift box ready',
  dispatch: 'On the way',
  delivered: 'Delivered',
};

const TIMELINE = ['paid', 'packing', 'packed', 'dispatch', 'delivered'];

type GiftOrderData = {
  id: string;
  gift_status: string;
  recipient_name: string;
  gift_message?: string | null;
  occasion?: string | null;
  gift_boxes?: { name: string } | null;
  events?: { status: string; created_at: string }[];
};

type Props = {
  orderId: string;
  supabaseOrderId?: string | null;
};

export default function GiftOrderTimeline({ orderId, supabaseOrderId }: Props) {
  const [gift, setGift] = useState<GiftOrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const targetId = supabaseOrderId || orderId;
    if (!targetId) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/gifts/track?order_id=${encodeURIComponent(targetId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.success && json.data) setGift(json.data);
      setLoading(false);
    })();
  }, [orderId, supabaseOrderId]);

  if (loading || !gift) return null;

  const statusIndex = TIMELINE.indexOf(
    gift.gift_status === 'new' ? 'paid' : gift.gift_status
  );

  return (
    <div className="rounded-xl border border-rose-100 bg-gradient-to-br from-rose-50/50 to-white p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-5 h-5 text-rose-600" />
        <div>
          <p className="font-semibold text-gray-900">{gift.gift_boxes?.name || 'Gift order'}</p>
          <p className="text-sm text-gray-600">For {gift.recipient_name}</p>
        </div>
      </div>

      <ol className="space-y-2">
        {TIMELINE.map((step, idx) => {
          const done = statusIndex >= idx && gift.gift_status !== 'cancelled';
          const active = (gift.gift_status === 'new' && step === 'paid' ? false : gift.gift_status === step) ||
            (gift.gift_status === 'new' && step === 'paid' && idx === 0);
          return (
            <li key={step} className="flex items-center gap-2 text-sm">
              {done || active ? (
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${active ? 'text-rose-600' : 'text-green-600'}`} />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
              )}
              <span className={done || active ? 'text-gray-900' : 'text-gray-400'}>
                {GIFT_STATUS_LABELS[step]}
              </span>
            </li>
          );
        })}
      </ol>

      {gift.gift_message && (
        <p className="text-sm text-gray-600 italic border-t pt-3">&ldquo;{gift.gift_message}&rdquo;</p>
      )}
    </div>
  );
}
