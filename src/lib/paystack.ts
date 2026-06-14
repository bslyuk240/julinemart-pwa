'use client';

/**
 * Robust loader for Paystack's inline.js.
 *
 * Why this exists: the old code injected the script fire-and-forget (no onload/
 * onerror) and then guessed with a fixed `setTimeout(…, 500)` before calling
 * PaystackPop.setup(). On slow networks / cold loads / ad-blockers that race
 * failed silently — the popup "took long" or "didn't show", and the only
 * recovery was a full page refresh.
 *
 * This module:
 *   - injects the script once (idempotent, dedupes against next/script preload)
 *   - tracks readiness via a shared promise
 *   - retries the injection once if the first request errors (CDN blip / flaky net)
 *   - exposes ensurePaystackReady() that resolves the moment PaystackPop exists,
 *     or rejects after a real timeout so the UI can show an honest message + retry
 */

const PAYSTACK_SRC = 'https://js.paystack.co/v1/inline.js';
const DEFAULT_TIMEOUT_MS = 15_000;

let readyPromise: Promise<void> | null = null;

function paystackAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).PaystackPop);
}

function injectScript(): HTMLScriptElement {
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${PAYSTACK_SRC}"], script[data-paystack="true"]`
  );
  if (existing) return existing;

  const script = document.createElement('script');
  script.src = PAYSTACK_SRC;
  script.async = true;
  script.dataset.paystack = 'true';
  document.body.appendChild(script);
  return script;
}

/**
 * Resolves when window.PaystackPop is available. Loads the script if needed,
 * retries the injection once on error, and rejects after `timeoutMs`.
 */
export function ensurePaystackReady(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Paystack can only load in the browser'));
  }
  if (paystackAvailable()) return Promise.resolve();

  // Reuse an in-flight load so concurrent callers share one attempt.
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<void>((resolve, reject) => {
    let triedReinject = false;
    let script = injectScript();

    const handleError = () => {
      // Re-inject exactly once before giving up; the interval below + timeout
      // are the ultimate arbiters of success/failure.
      if (triedReinject) return;
      triedReinject = true;
      try {
        script.remove();
      } catch {
        /* ignore */
      }
      script = injectScript();
      script.addEventListener('error', handleError);
    };
    script.addEventListener('error', handleError);

    const start = Date.now();
    const interval = window.setInterval(() => {
      if (paystackAvailable()) {
        window.clearInterval(interval);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        window.clearInterval(interval);
        readyPromise = null; // allow a fresh attempt next time
        reject(new Error('Payment system failed to load'));
      }
    }, 100);
  });

  return readyPromise;
}

/** Forces a fresh load attempt (used by a manual "retry" affordance). */
export function resetPaystackLoader(): void {
  readyPromise = null;
}
