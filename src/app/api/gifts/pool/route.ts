import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

/** Public gift pool products at a consolidation hub (default: Warri). */
export async function GET(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Catalog not configured' }, { status: 503 });
  }

  const gfc = request.nextUrl.searchParams.get('gfc');
  const gfcId = request.nextUrl.searchParams.get('gfc_id');
  const params = new URLSearchParams();
  if (gfcId) params.set('gfc_id', gfcId);
  else if (gfc) params.set('gfc', gfc);

  const url = `${JLO_BASE}/.netlify/functions/gift-pool-products${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, { next: { revalidate: 30 } });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
