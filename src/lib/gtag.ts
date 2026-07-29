import { getStoredConsent } from './cookie-consent';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-T0X3ZR08FD';

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
}

export function gaEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  // Respect cookie consent — GA4 Consent Mode also blocks this server-side,
  // but we guard here too so no event call is made at all when denied.
  if (getStoredConsent() !== 'all') return;

  window.gtag('event', eventName, params);
}

export function trackAddToCart(params: {
  currency?: string;
  value: number;
  items: EcommerceItem[];
}) {
  gaEvent('add_to_cart', {
    currency: params.currency ?? 'NGN',
    value: params.value,
    items: params.items,
  });
}

export function trackBeginCheckout(params: {
  currency?: string;
  value: number;
  items: EcommerceItem[];
}) {
  gaEvent('begin_checkout', {
    currency: params.currency ?? 'NGN',
    value: params.value,
    items: params.items,
  });
}

export function trackPurchase(params: {
  transactionId: string;
  currency?: string;
  value: number;
  shipping?: number;
  items: EcommerceItem[];
}) {
  gaEvent('purchase', {
    transaction_id: params.transactionId,
    currency: params.currency ?? 'NGN',
    value: params.value,
    shipping: params.shipping ?? 0,
    items: params.items,
  });
}

export function trackWhatsappClick(params: { linkUrl: string; placement: string }) {
  gaEvent('whatsapp_click', {
    link_url: params.linkUrl,
    placement: params.placement,
  });
}

export function trackPwaInstallPromptShown(params: { platform: string }) {
  gaEvent('pwa_install_prompt_shown', {
    platform: params.platform,
  });
}

export function trackPwaInstallAccepted(params: { platform: string }) {
  gaEvent('pwa_install_accepted', {
    platform: params.platform,
  });
}

// ─── Funnel events (missing before) ──────────────────────────────────────────

export function trackProductViewed(params: {
  itemId: string;
  itemName: string;
  price: number;
  currency?: string;
  itemBrand?: string;
  itemCategory?: string;
}) {
  gaEvent('view_item', {
    currency: params.currency ?? 'NGN',
    value: params.price,
    items: [{
      item_id: params.itemId,
      item_name: params.itemName,
      price: params.price,
      quantity: 1,
      item_brand: params.itemBrand,
      item_category: params.itemCategory,
    }],
  });
}

export function trackSearchUsed(params: { searchTerm: string; resultCount?: number }) {
  gaEvent('search', {
    search_term: params.searchTerm,
    result_count: params.resultCount,
  });
}

export function trackCheckoutAbandoned(params: {
  currency?: string;
  value: number;
  step: 'address' | 'payment' | 'review';
  items: EcommerceItem[];
}) {
  gaEvent('checkout_abandoned', {
    currency: params.currency ?? 'NGN',
    value: params.value,
    checkout_step: params.step,
    items: params.items,
  });
}

export function trackAddToWishlist(params: {
  itemId: string;
  itemName: string;
  price: number;
  currency?: string;
}) {
  gaEvent('add_to_wishlist', {
    currency: params.currency ?? 'NGN',
    value: params.price,
    items: [{
      item_id: params.itemId,
      item_name: params.itemName,
      price: params.price,
      quantity: 1,
    }],
  });
}

export function trackLoginSuccess(params: { method: string }) {
  gaEvent('login', { method: params.method });
}

export function trackSignupSuccess(params: { method: string }) {
  gaEvent('sign_up', { method: params.method });
}

export function trackShareProduct(params: { itemId: string; itemName: string; method: string }) {
  gaEvent('share', {
    method: params.method,
    content_type: 'product',
    item_id: params.itemId,
    content_id: params.itemName,
  });
}
