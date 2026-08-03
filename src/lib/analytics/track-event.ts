import { getOrCreateAnonymousId } from './anonymous-id';

type JourneyEventType = 'product_viewed';

export function trackJourneyEvent(params: {
  eventType: JourneyEventType;
  customerId?: string | null;
  customerEmail?: string | null;
  productId?: string | null;
  sourcePage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    fetch('/api/analytics/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: params.eventType,
        customer_id: params.customerId ?? null,
        anonymous_id: getOrCreateAnonymousId(),
        customer_email: params.customerEmail ?? null,
        product_id: params.productId ?? null,
        source_page: params.sourcePage ?? window.location.pathname,
        metadata: params.metadata ?? {},
      }),
    }).catch(() => {});
  } catch {
    // Non-critical — never let analytics tracking break the page.
  }
}
