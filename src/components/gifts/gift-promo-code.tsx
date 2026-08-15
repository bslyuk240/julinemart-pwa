'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils/format-price';
import { validateGiftVoucher, type GiftVoucherResult } from '@/lib/gifts/voucher';
import { toast } from 'sonner';

type GiftPromoCodeProps = {
  customerEmail: string;
  orderSubtotal: number;
  giftBoxSlug?: string;
  builderSessionToken?: string;
  gfcCode?: string;
  applied: GiftVoucherResult | null;
  onApplied: (result: GiftVoucherResult) => void;
  onRemoved: () => void;
};

export default function GiftPromoCode({
  customerEmail,
  orderSubtotal,
  giftBoxSlug,
  builderSessionToken,
  gfcCode,
  applied,
  onApplied,
  onRemoved,
}: GiftPromoCodeProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  const apply = async () => {
    if (!code.trim()) {
      toast.error('Enter a voucher code');
      return;
    }
    if (!customerEmail.trim()) {
      toast.error('Enter your email first');
      return;
    }
    if (!orderSubtotal) {
      toast.error('Order total not ready yet');
      return;
    }

    setApplying(true);
    setError('');
    try {
      const result = await validateGiftVoucher({
        voucherCode: code,
        customerEmail,
        giftBoxSlug,
        builderSessionToken,
        gfcCode,
        orderSubtotal,
      });
      onApplied(result);
      toast.success(`Voucher applied (−${formatPrice(result.discount_amount)})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not apply voucher';
      setError(message);
      toast.error(message);
    } finally {
      setApplying(false);
    }
  };

  if (applied) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50/60 p-3 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium text-green-900">
              <Tag className="h-4 w-4 shrink-0" />
              {applied.code}
            </p>
            {applied.campaign_name ? (
              <p className="mt-0.5 text-xs text-green-800">{applied.campaign_name}</p>
            ) : null}
            <p className="mt-1 text-green-800">−{formatPrice(applied.discount_amount)} off your gift</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-green-700 hover:bg-green-100"
            onClick={() => {
              onRemoved();
              setCode('');
              setError('');
            }}
            aria-label="Remove voucher"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-sm font-medium text-gray-900">Promo code</p>
      <div className="flex gap-2">
        <Input
          placeholder="Campaign voucher code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError('');
          }}
          className="min-h-[44px] uppercase"
        />
        <Button type="button" variant="outline" className="shrink-0" disabled={applying} onClick={apply}>
          {applying ? 'Checking…' : 'Apply'}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-gray-500">Discount applies to your gift total — vendors are paid in full.</p>
    </div>
  );
}
