'use client';

import { supabase } from '@/lib/supabase/client';

const JLO_BASE = (process.env.NEXT_PUBLIC_JLO_CATALOG_URL || '').replace(/\/$/, '');

export async function logActivity(params: {
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${JLO_BASE}/api/log-activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ...params, source: 'storefront' }),
    });
  } catch {
    // Non-critical — never block the user flow
  }
}
