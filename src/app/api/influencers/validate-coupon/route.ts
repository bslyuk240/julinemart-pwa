import { NextResponse } from 'next/server';

/**
 * The catalog host (e.g. jlo.julinemart.com) serves Netlify functions, not the orchestrator
 * Express /api/* routes. Checkout must not call /api/influencers/* on that host.
 *
 * This route proxies to:
 * 1) Supabase Edge Function `influencers` (preferred when PWA + JLO share the same project)
 * 2) JLO_API_BASE_URL orchestrator API if Supabase env is missing (e.g. local / legacy)
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const jloApi = (process.env.JLO_API_BASE_URL || '').replace(/\/$/, '');
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).replace(/\/$/, '');
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  const forward = async (url: string, headers: Record<string, string>) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    const data = text
      ? (() => {
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return { success: false, error: 'Invalid response from coupon service' };
          }
        })()
      : { success: false, error: 'Empty response from coupon service' };
    return NextResponse.json(data as object, { status: res.status });
  };

  if (supabaseUrl && supabaseKey) {
    return forward(
      `${supabaseUrl}/functions/v1/influencers/validate-coupon`,
      {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      }
    );
  }

  if (jloApi) {
    return forward(`${jloApi}/api/influencers/validate-coupon`, {});
  }

  return NextResponse.json(
    {
      success: false,
      error:
        'Influencer coupon is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or JLO_API_BASE_URL for the orchestrator API).',
    },
    { status: 503 }
  );
}
