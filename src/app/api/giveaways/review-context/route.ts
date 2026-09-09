import { NextResponse } from 'next/server';
import { giveawayReviewContextSchema } from '@/lib/validations/giveaways';

/**
 * Review-composer context lookup lives in the JLO Netlify function
 * `giveaway-get-review-context` (orchestrator:
 * netlify/functions/giveaway-get-review-context.js). Same cross-origin-
 * avoidance reasoning as /api/vouchers/validate.
 *
 * Proxies to: {JLO_BASE}/.netlify/functions/giveaway-get-review-context
 */
const getJloCatalogBase = () =>
  (process.env.JLO_API_BASE_URL || process.env.NEXT_PUBLIC_JLO_CATALOG_URL || '').replace(
    /\/$/,
    ''
  );

export async function POST(request: Request) {
  const rawBody = await request.json().catch(() => null);
  if (!rawBody || typeof rawBody !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = giveawayReviewContextSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const jloBase = getJloCatalogBase();
  if (!jloBase) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Giveaway reviews are not configured. Set JLO_API_BASE_URL or NEXT_PUBLIC_JLO_CATALOG_URL to your JLO catalog (Netlify) site.',
      },
      { status: 503 }
    );
  }

  const url = `${jloBase}/.netlify/functions/giveaway-get-review-context`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry_id: parsed.data.entryId }),
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
