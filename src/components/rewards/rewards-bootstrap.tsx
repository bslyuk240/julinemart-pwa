'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { REFERRAL_STORAGE_KEY, rewardsFetch } from '@/lib/rewards';

/**
 * Mounted once in the root layout. Does two quiet things:
 *  1. Remembers a ?ref=CODE from a referral link until the visitor signs in,
 *     then applies it once (JLO decides whether it is valid).
 *  2. After sign-in, opens the wallet once per session so a verified new
 *     account receives its one-time welcome bonus, and says so.
 * Renders nothing, and does nothing while the programme is off.
 */
export default function RewardsBootstrap() {
  const { isAuthenticated, isLoading, user } = useCustomerAuth();
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get('ref');
      if (ref && /^[A-Za-z0-9]{4,32}$/.test(ref)) {
        window.localStorage.setItem(REFERRAL_STORAGE_KEY, ref.toUpperCase());
      }
    } catch { /* storage unavailable */ }
  }, []);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user?.id || ranFor.current === user.id) return;
    ranFor.current = user.id;

    (async () => {
      try {
        let code: string | null = null;
        try { code = window.localStorage.getItem(REFERRAL_STORAGE_KEY); } catch { /* ignore */ }
        if (code) {
          const res = await rewardsFetch('referral', { code });
          // Keep the code only if the call itself failed; any answer is final.
          if (res && res.status < 500) {
            try { window.localStorage.removeItem(REFERRAL_STORAGE_KEY); } catch { /* ignore */ }
          }
        }
        const wallet = await rewardsFetch('wallet');
        const bonus = wallet?.data?.signup_bonus?.points;
        if (bonus) {
          toast.success(`Welcome! ${bonus} JulinePoints have been added to your wallet.`);
        }
      } catch { /* never disturb the page */ }
    })();
  }, [isAuthenticated, isLoading, user?.id]);

  return null;
}
