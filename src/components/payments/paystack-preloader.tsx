'use client';

import { useEffect } from 'react';
import { ensurePaystackReady } from '@/lib/paystack';

/**
 * Globally preloads Paystack inline.js as soon as the app mounts, so the popup
 * is ready well before the user reaches checkout/payment.
 *
 * We deliberately do NOT use next/script for this: next/script stamps a
 * `data-nscript` attribute on the tag, and inline.js treats ANY data-* on its
 * own script as drop-in mode — it auto-runs setup() and throws "put your
 * Paystack Inline javascript file inside of a form element". Our loader injects
 * a clean <script> (src + id only), which avoids that auto-init entirely.
 */
export default function PaystackPreloader() {
  useEffect(() => {
    ensurePaystackReady().catch(() => {
      /* surfaced when the user actually initiates payment */
    });
  }, []);

  return null;
}
