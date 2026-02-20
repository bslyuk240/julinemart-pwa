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
