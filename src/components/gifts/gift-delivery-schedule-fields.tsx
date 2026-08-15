'use client';

import { CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useGiftDeliveryDates } from '@/hooks/use-gift-delivery-dates';
import { GiftCheckoutSection } from '@/components/gifts/gift-checkout-sections';

type Props = {
  gfcCode?: string;
  giftBoxSlug?: string;
  builderSessionToken?: string;
  requestedDeliveryDate: string;
  occasionDate: string;
  onRequestedDeliveryDateChange: (value: string) => void;
  onOccasionDateChange: (value: string) => void;
  enabled?: boolean;
};

export default function GiftDeliveryScheduleFields({
  gfcCode = 'warri',
  giftBoxSlug,
  builderSessionToken,
  requestedDeliveryDate,
  occasionDate,
  onRequestedDeliveryDateChange,
  onOccasionDateChange,
  enabled = true,
}: Props) {
  const { earliestDate, latestDate, loading, error, window } = useGiftDeliveryDates({
    gfcCode,
    giftBoxSlug,
    builderSessionToken,
    enabled,
  });

  const hint =
    window?.same_day_supported && window.max_lead_time_days === 0
      ? 'Same-day may be available before hub cutoff.'
      : window?.next_day_supported && (window.max_lead_time_days ?? 0) <= 1
        ? 'Next-day delivery may be available for this gift.'
        : null;

  return (
    <GiftCheckoutSection
      icon={<CalendarDays className="h-6 w-6 text-primary-600" />}
      title="Delivery schedule"
    >
      <div className="space-y-4">

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Preferred delivery date <span className="text-rose-600">*</span>
        </label>
        <Input
          type="date"
          required
          min={earliestDate || undefined}
          max={latestDate || undefined}
          value={requestedDeliveryDate}
          onChange={(e) => onRequestedDeliveryDateChange(e.target.value)}
          disabled={loading && !earliestDate}
        />
        {loading ? (
          <p className="mt-1 text-xs text-gray-500">Checking earliest available date…</p>
        ) : error ? (
          <p className="mt-1 text-xs text-amber-700">{error}</p>
        ) : earliestDate ? (
          <p className="mt-1 text-xs text-gray-500">
            Earliest: {earliestDate}
            {latestDate ? ` · Latest: ${latestDate}` : null}
            {hint ? ` · ${hint}` : null}
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Occasion date <span className="font-normal text-gray-500">(optional)</span>
        </label>
        <Input
          type="date"
          value={occasionDate}
          onChange={(e) => onOccasionDateChange(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-500">
          e.g. birthday or anniversary — helps our team schedule the surprise.
        </p>
      </div>
      </div>
    </GiftCheckoutSection>
  );
}
