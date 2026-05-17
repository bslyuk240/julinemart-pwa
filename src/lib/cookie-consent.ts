import { safeStorage } from './safe-storage';

export type ConsentChoice = 'all' | 'essential';

const CONSENT_KEY = 'jm_cookie_consent';

/** Returns the stored consent choice, or null if the user hasn't decided yet. */
export function getStoredConsent(): ConsentChoice | null {
  const val = safeStorage.getItem(CONSENT_KEY);
  if (val === 'all' || val === 'essential') return val;
  return null;
}

/** Persists the user's choice. */
export function storeConsent(choice: ConsentChoice): void {
  safeStorage.setItem(CONSENT_KEY, choice);
}

/**
 * Sends a GA4 Consent Mode v2 `update` command.
 * Call this immediately after the user makes a choice, and on every page
 * load when a stored choice already exists.
 */
export function applyGaConsent(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', {
    analytics_storage: choice === 'all' ? 'granted' : 'denied',
    ad_storage: 'denied', // JulineMart does not run ads
  });
}
