import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ states: [], cities: [], areas: [] });
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString();
  const url = `${JLO_BASE}/.netlify/functions/discover-areas${qs ? `?${qs}` : ''}`;

  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    const json = await res.json().catch(() => ({ success: false, data: {} }));
    if (!res.ok || !json.success) {
      return NextResponse.json({ states: [], cities: [], areas: [] });
    }
    return NextResponse.json(json.data || { states: [] });
  } catch {
    return NextResponse.json({ states: [] }, { status: 502 });
  }
}
