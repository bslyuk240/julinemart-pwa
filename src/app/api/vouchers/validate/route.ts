import { NextResponse } from 'next/server';

/**
 * Campaign voucher validation lives in the JLO Netlify function `voucherHelpers`
 * (orchestrator: netlify/functions/helpers/voucherHelpers.js). The browser should not
 * call a cross-origin Netlify URL by default (CORS and HTML error pages on failure).
 *
 * Proxies to: {JLO_BASE}/.netlify/functions/voucherHelpers
 * JLO_BASE = JLO_API_BASE_URL || NEXT_PUBLIC_JLO_CATALOG_URL (same as /api/shipping/jlo)
 */
// Same base resolution as `src/app/api/shipping/jlo/route.ts` (Netlify is on the catalog host)
const getJloCatalogBase = () =>
  (process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_CATALOG_URL || '').replace(
    /\/$/,
    ''
  );

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const jloBase = getJloCatalogBase();
  if (!jloBase) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Voucher validation is not configured. Set JLO_API_BASE_URL or NEXT_PUBLIC_JLO_CATALOG_URL to your JLO catalog (Netlify) site.',
      },
      { status: 503 }
    );
  }

  const url = `${jloBase}/.netlify/functions/voucherHelpers`;
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
          return {
            success: false,
            error: 'Invalid response from voucher service',
          };
        }
      })()
    : { success: false, error: 'Empty response from voucher service' };

  return NextResponse.json(data as object, { status: res.status });
}
