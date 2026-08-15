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
  const occasion = request.nextUrl.searchParams.get('occasion');
  const recipient = request.nextUrl.searchParams.get('recipient');
  const budget = request.nextUrl.searchParams.get('budget');

  const params = new URLSearchParams({ gfc });
  if (slug) params.set('slug', slug);
  if (occasion) params.set('occasion', occasion);
  if (recipient) params.set('recipient', recipient);
  if (budget === 'under-10k') params.set('budget_max', '10000');
  else if (budget === 'under-20k') params.set('budget_max', '20000');
  else if (budget === 'under-50k') params.set('budget_max', '50000');
  else if (budget === 'premium') params.set('budget_min', '50000');

  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-boxes?${params}`, {
    next: { revalidate: 60 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
