'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchGiftDeliveryDates,
  type GiftDeliveryDatesParams,
  type GiftDeliveryDatesResult,
} from '@/lib/gifts/delivery-dates';

export function useGiftDeliveryDates(params: GiftDeliveryDatesParams & { enabled?: boolean }) {
  const { enabled = true, ...rest } = params;
  const [window, setWindow] = useState<GiftDeliveryDatesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    fetchGiftDeliveryDates(rest)
      .then((data) => {
        if (id !== requestId.current) return;
        setWindow(data);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setWindow(null);
        setError(err instanceof Error ? err.message : 'Could not load delivery dates');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [enabled, rest.gfcCode, rest.giftBoxSlug, rest.builderSessionToken]);

  return {
    earliestDate: window?.earliest_date ?? null,
    latestDate: window?.latest_date ?? null,
    loading,
    error,
    window,
  };
}
