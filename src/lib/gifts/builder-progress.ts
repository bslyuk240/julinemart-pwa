/**
 * Client-side progress for the build-your-own gift flow.
 *
 * Recipient, occasion, budget, box and items already live on the JLO builder
 * session (resumed via its token). What the server does not know is which step
 * the shopper was on and their half-filled checkout form, so a reload used to
 * drop them back to step 1. We keep those here, keyed by session token.
 *
 * The step goes in localStorage (no personal data). The checkout form holds
 * names, phones and addresses, so it goes in sessionStorage: it survives a
 * reload but not closing the tab.
 */

export const GIFT_BUILDER_SESSION_KEY = 'julinemart_gift_builder_token';
const STEP_KEY = 'julinemart_gift_builder_step';
const CHECKOUT_KEY = 'julinemart_gift_builder_checkout';

export const GIFT_BUILDER_LAST_STEP = 3;

type StoredStep = { token: string; step: number };
type StoredCheckout<T> = { token: string; checkout: T };

export type BuilderProgressGate = {
  hasPackaging: boolean;
  itemCount: number;
};

/** Furthest step the session's server state allows, so a restore never lands on an invalid step. */
export function clampGiftBuilderStep(step: unknown, gate: BuilderProgressGate): number {
  const n = typeof step === 'number' && Number.isInteger(step) ? step : 0;
  let max = 1;
  if (gate.hasPackaging) max = 2;
  if (gate.hasPackaging && gate.itemCount > 0) max = GIFT_BUILDER_LAST_STEP;
  return Math.min(Math.max(n, 0), max);
}

function read<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | undefined, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked — progress just isn't saved */
  }
}

function local(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

function session(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function loadGiftBuilderStep(token: string): number | null {
  const saved = read<StoredStep>(local(), STEP_KEY);
  return saved && saved.token === token ? saved.step : null;
}

export function saveGiftBuilderStep(token: string, step: number) {
  write(local(), STEP_KEY, { token, step } satisfies StoredStep);
}

export function loadGiftBuilderCheckout<T extends object>(token: string): Partial<T> | null {
  const saved = read<StoredCheckout<Partial<T>>>(session(), CHECKOUT_KEY);
  return saved && saved.token === token && saved.checkout && typeof saved.checkout === 'object'
    ? saved.checkout
    : null;
}

export function saveGiftBuilderCheckout<T extends object>(token: string, checkout: T) {
  write(session(), CHECKOUT_KEY, { token, checkout } satisfies StoredCheckout<T>);
}

/** Forget the session and everything saved for it (order placed, or session no longer a draft). */
export function clearGiftBuilderProgress() {
  try {
    local()?.removeItem(GIFT_BUILDER_SESSION_KEY);
    local()?.removeItem(STEP_KEY);
    session()?.removeItem(CHECKOUT_KEY);
  } catch {
    /* noop */
  }
}
