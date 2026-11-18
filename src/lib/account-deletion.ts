import { supabase } from '@/lib/supabase/client';

export type DeletionReason = { code: string; message: string; count?: number };
export type DeletionResponse = {
  success: boolean;
  error?: string;
  eligible?: boolean;
  reasons?: DeletionReason[];
  sent_to_hint?: string;
  deleted?: boolean;
};

/** Authenticated call to the same-origin deletion proxy. Returns null if signed out. */
export async function deletionFetch(
  action: 'status' | 'request' | 'confirm',
  token?: string,
): Promise<{ status: number; data: DeletionResponse } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return null;
  const res = await fetch('/api/account/deletion', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token }),
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => ({}))) as DeletionResponse;
  return { status: res.status, data };
}
