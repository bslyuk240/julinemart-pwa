'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import {
  CUSTOM_ORDER_STATUS_LABELS,
  type CustomOrderSpec,
  type CustomOrderStatus,
} from '@/types/custom-order';

const TIMELINE: CustomOrderStatus[] = [
  'submitted',
  'seller_reviewing',
  'seller_confirmed',
  'proof_sent',
  'customer_approved',
  'in_production',
  'ready',
  'dispatched',
  'delivered',
];

type Message = {
  id: string;
  custom_order_spec_id: string;
  sender_type: string;
  message: string;
  created_at: string;
};

type Props = {
  orderId: string;
  customerEmail: string;
  supabaseOrderId?: string | null;
};

export default function CustomOrderTimeline({ orderId, customerEmail, supabaseOrderId }: Props) {
  const [specs, setSpecs] = useState<CustomOrderSpec[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchData = async () => {
    const targetId = supabaseOrderId || orderId;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setLoading(false);
      return;
    }
    const res = await fetch(
      `/api/custom-order?order_id=${encodeURIComponent(targetId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const json = await res.json();
    if (json.success) {
      setSpecs(json.data.specs || []);
      setMessages(json.data.messages || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (customerEmail && (supabaseOrderId || orderId)) fetchData();
  }, [orderId, customerEmail, supabaseOrderId]);

  if (loading || !specs.length) return null;

  const approveProof = async (specId: string) => {
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/custom-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spec_id: specId, action: 'approve_proof' }),
      });
      const json = await res.json();
      if (json.success) await fetchData();
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async (specId: string) => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch('/api/custom-order', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          spec_id: specId,
          action: 'message',
          message: draft.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setDraft('');
        await fetchData();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {specs.map((spec) => {
        const productName =
          (spec as CustomOrderSpec & { order_items?: { product_name?: string } }).order_items
            ?.product_name || 'Custom item';
        const statusIndex = TIMELINE.indexOf(spec.status);
        const specMessages = messages.filter((m) => m.custom_order_spec_id === spec.id);

        return (
          <div key={spec.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div>
              <p className="font-semibold text-gray-900">{productName}</p>
              <p className="text-sm text-gray-500">Made-to-order · JulineMart Custom</p>
            </div>

            <ol className="space-y-2">
              {TIMELINE.map((step, idx) => {
                const done = statusIndex >= idx && spec.status !== 'cancelled';
                const active = spec.status === step;
                return (
                  <li key={step} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary-600' : 'text-green-600'}`} />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    )}
                    <span className={done ? 'text-gray-900' : 'text-gray-400'}>
                      {CUSTOM_ORDER_STATUS_LABELS[step]}
                    </span>
                  </li>
                );
              })}
            </ol>

            {spec.approved_proof_url && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm">
                <p className="font-medium mb-1">Proof preview</p>
                <a
                  href={spec.approved_proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline break-all"
                >
                  View proof
                </a>
                {spec.status === 'proof_sent' && (
                  <Button
                    size="sm"
                    className="mt-2 w-full"
                    disabled={busy}
                    onClick={() => approveProof(spec.id)}
                  >
                    Approve proof
                  </Button>
                )}
              </div>
            )}

            {specMessages.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Messages
                </p>
                {specMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm rounded-lg px-3 py-2 ${
                      m.sender_type === 'customer' ? 'bg-primary-50 ml-4' : 'bg-gray-50 mr-4'
                    }`}
                  >
                    <p className="text-xs text-gray-500 mb-0.5 capitalize">{m.sender_type}</p>
                    <p>{m.message}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 border-t pt-3">
              <input
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Message the seller…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button size="sm" disabled={busy || !draft.trim()} onClick={() => sendMessage(spec.id)}>
                Send
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
