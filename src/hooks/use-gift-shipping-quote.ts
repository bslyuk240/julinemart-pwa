'use client';

import { useEffect, useRef, useState } from 'react';
import {
  fetchGiftShippingQuote,
  type GiftShippingQuoteParams,
} from '@/lib/gifts/shipping-quote';

const FALLBACK_SHIPPING = 2500;

export function useGiftShippingQuote(params: GiftShippingQuoteParams & { enabled?: boolean }) {
  const { enabled = true, deliveryState, deliveryCity, ...rest } = params;
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const state = deliveryState.trim();
    const city = deliveryCity.trim();
    if (!state || !city) {
      setShippingFee(null);
      setError(null);
      setZone(null);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await fetchGiftShippingQuote({
          deliveryState: state,
          deliveryCity: city,
          ...rest,
        });
        if (id !== requestId.current) return;
        setShippingFee(result.shipping);
        setZone(result.zone ?? null);
      } catch (err) {
        if (id !== requestId.current) return;
        setShippingFee(null);
        setError(err instanceof Error ? err.message : 'Could not calculate delivery');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    enabled,
    deliveryState,
    deliveryCity,
    rest.gfcCode,
    rest.giftBoxSlug,
    rest.builderSessionToken,
    rest.orderValue,
  ]);

  const resolvedShipping = shippingFee ?? (loading ? null : FALLBACK_SHIPPING);

  return {
    shippingFee: resolvedShipping,
    quotedShipping: shippingFee,
    loading,
    error,
    zone,
    canCheckout: Boolean(deliveryState.trim() && deliveryCity.trim() && shippingFee != null && !loading),
  };
}
