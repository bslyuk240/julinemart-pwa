import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Catalog not configured' }, { status: 503 });
  }

  const gfc = request.nextUrl.searchParams.get('gfc') || 'warri';
  const slug = request.nextUrl.searchParams.get('slug');

  const params = new URLSearchParams({ gfc });
  if (slug) params.set('slug', slug);

  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-boxes?${params}`, {
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
