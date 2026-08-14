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

  const sessionToken = request.nextUrl.searchParams.get('session_token');
  if (!sessionToken) {
    return NextResponse.json({ success: false, error: 'session_token required' }, { status: 400 });
  }

  const res = await fetch(
    `${JLO_BASE}/.netlify/functions/gift-builder?session_token=${encodeURIComponent(sessionToken)}`
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Catalog not configured' }, { status: 503 });
  }

  const body = await request.json();
  const res = await fetch(`${JLO_BASE}/.netlify/functions/gift-builder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
