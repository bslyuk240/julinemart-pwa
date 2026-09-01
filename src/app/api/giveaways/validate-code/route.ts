import { NextResponse } from 'next/server';

/**
 * Giveaway secret-code validation lives in the JLO Netlify function
 * `giveaway-validate-code` (orchestrator: netlify/functions/giveaway-validate-code.js).
 * Same cross-origin-avoidance reasoning as /api/vouchers/validate.
 *
 * Proxies to: {JLO_BASE}/.netlify/functions/giveaway-validate-code
 */
const getJloCatalogBase = () =>
  (process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_CATALOG_URL || '').replace(
    /\/$/,
    ''
  );

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const jloBase = getJloCatalogBase();
  if (!jloBase) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Giveaway validation is not configured. Set JLO_API_BASE_URL or NEXT_PUBLIC_JLO_CATALOG_URL to your JLO catalog (Netlify) site.',
      },
      { status: 503 }
    );
  }

  const url = `${jloBase}/.netlify/functions/giveaway-validate-code`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  const data = text
    ? (() => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          return { success: false, error: 'Invalid response from giveaway service' };
        }
      })()
    : { success: false, error: 'Empty response from giveaway service' };

  return NextResponse.json(data as object, { status: res.status });
}
