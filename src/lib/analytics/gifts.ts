import { gaEvent, trackBeginCheckout, trackPurchase, type EcommerceItem } from '@/lib/gtag';
import { getOrCreateAnonymousId } from './anonymous-id';

export type GiftOrderMode = 'ready_made' | 'build_your_own';

type GiftJourneyEventType = 'gift_landing_view' | 'gift_byo_start' | 'gift_purchase';

function trackGiftJourney(params: {
  eventType: GiftJourneyEventType;
  sourcePage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: params.eventType,
        anonymous_id: getOrCreateAnonymousId(),
        source_page: params.sourcePage ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
        metadata: params.metadata ?? {},
      }),
    }).catch(() => {});
  } catch {
    // Non-critical
  }
}

export function trackGiftLandingView(params: {
  source: 'home_rail' | 'gifts_landing' | 'occasion_seo';
  occasion?: string;
  boxCount?: number;
}) {
  gaEvent('gift_landing_view', {
    source: params.source,
    occasion: params.occasion ?? '',
    box_count: params.boxCount ?? 0,
  });
  trackGiftJourney({
    eventType: 'gift_landing_view',
    metadata: params,
  });
}

export function trackGiftFilterApplied(params: {
  occasion?: string;
  recipient?: string;
  budget?: string;
}) {
  gaEvent('gift_filter_applied', params);
}

export function trackGiftBoxView(params: {
  boxSlug: string;
  boxName: string;
  price: number;
}) {
  gaEvent('gift_box_view', {
    box_slug: params.boxSlug,
    box_name: params.boxName,
    value: params.price,
    currency: 'NGN',
  });
}

export function trackGiftByoStart(params?: { resumed?: boolean }) {
  gaEvent('gift_byo_start', { resumed: params?.resumed ?? false });
  trackGiftJourney({
    eventType: 'gift_byo_start',
    metadata: { resumed: params?.resumed ?? false },
  });
}

export function trackGiftBeginCheckout(params: {
  mode: GiftOrderMode;
  value: number;
  boxSlug?: string;
  boxName?: string;
  itemCount?: number;
}) {
  const items: EcommerceItem[] = [
    {
      item_id: params.boxSlug || (params.mode === 'build_your_own' ? 'gift-byo' : 'gift-box'),
      item_name: params.boxName || (params.mode === 'build_your_own' ? 'Build your own gift box' : 'Gift box'),
      price: params.value,
      quantity: 1,
      item_category: 'gifts',
      item_variant: params.mode,
    },
  ];

  trackBeginCheckout({ value: params.value, items });
  gaEvent('gift_begin_checkout', {
    mode: params.mode,
    box_slug: params.boxSlug ?? '',
    item_count: params.itemCount ?? 0,
    value: params.value,
    currency: 'NGN',
  });
}

export function trackGiftPurchase(params: {
  mode: GiftOrderMode;
  transactionId: string;
  value: number;
  shipping?: number;
  boxSlug?: string;
  boxName?: string;
}) {
  const items: EcommerceItem[] = [
    {
      item_id: params.boxSlug || (params.mode === 'build_your_own' ? 'gift-byo' : 'gift-box'),
      item_name: params.boxName || (params.mode === 'build_your_own' ? 'Build your own gift box' : 'Gift box'),
      price: params.value - (params.shipping ?? 0),
      quantity: 1,
      item_category: 'gifts',
      item_variant: params.mode,
    },
  ];

  trackPurchase({
    transactionId: params.transactionId,
    value: params.value,
    shipping: params.shipping ?? 0,
    items,
  });

  gaEvent('gift_purchase', {
    mode: params.mode,
    transaction_id: params.transactionId,
    box_slug: params.boxSlug ?? '',
    value: params.value,
    currency: 'NGN',
  });

  trackGiftJourney({
    eventType: 'gift_purchase',
    metadata: {
      mode: params.mode,
      transaction_id: params.transactionId,
      box_slug: params.boxSlug,
      value: params.value,
    },
  });
}
