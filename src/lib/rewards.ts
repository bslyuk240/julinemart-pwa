import { supabase } from '@/lib/supabase/client';

/** Authenticated call to the same-origin rewards proxy. Returns null if signed out. */
export async function rewardsFetch<T = any>(
  action: 'wallet' | 'claim' | 'referral',
  body?: Record<string, unknown>,
): Promise<{ status: number; data: T } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return null;
  const res = await fetch(`/api/rewards/${action}`, {
    method: action === 'wallet' ? 'GET' : 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: action === 'wallet' ? undefined : JSON.stringify(body ?? {}),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

export const REFERRAL_STORAGE_KEY = 'jm_referral_code';

export function formatNaira(amount: number) {
  return `₦${(Number(amount) || 0).toLocaleString()}`;
}
