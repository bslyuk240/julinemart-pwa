'use client';

import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/utils/format-price';
import { validateGiftVoucher, type GiftVoucherResult } from '@/lib/gifts/voucher';
import { toast } from 'sonner';
import { GiftCheckoutSection } from '@/components/gifts/gift-checkout-sections';

type GiftPromoCodeProps = {
  customerEmail: string;
  orderSubtotal: number;
  giftBoxSlug?: string;
  builderSessionToken?: string;
  gfcCode?: string;
  occasion?: string;
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
  occasion,
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
        occasion,
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
      <GiftCheckoutSection icon={<Tag className="h-6 w-6 text-primary-600" />} title="Have a promo code?">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-green-900">{applied.code} applied</p>
            {applied.campaign_name ? (
              <p className="text-xs text-green-800">{applied.campaign_name}</p>
            ) : null}
            <p className="text-sm text-green-800">−{formatPrice(applied.discount_amount)} off your gift</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1 text-green-700 hover:bg-green-100"
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
      </GiftCheckoutSection>
    );
  }

  return (
    <GiftCheckoutSection icon={<Tag className="h-6 w-6 text-primary-600" />} title="Have a promo code?">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="min-w-0 w-full sm:flex-1">
          <Input
            placeholder="Enter voucher code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (error) setError('');
            }}
            className="uppercase"
            fullWidth
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full shrink-0 sm:w-auto"
          disabled={applying}
          onClick={apply}
        >
          {applying ? 'Checking…' : 'Apply'}
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </GiftCheckoutSection>
  );
}
