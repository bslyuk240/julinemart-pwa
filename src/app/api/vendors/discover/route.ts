import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ vendors: [], meta: { total: 0 } });
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = `${JLO_BASE}/.netlify/functions/catalog-vendors${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, { next: { revalidate: 120 } });
    const json = await res.json().catch(() => ({ success: false, data: [] }));
    if (!res.ok || !json.success) {
      return NextResponse.json({ vendors: [], meta: json.meta || { total: 0 } });
    }
    return NextResponse.json({ vendors: json.data || [], meta: json.meta || {} });
  } catch {
    return NextResponse.json({ vendors: [], meta: { total: 0 } }, { status: 502 });
  }
}
