import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const orderId = request.nextUrl.searchParams.get('order_id');
  if (!orderId) {
    return NextResponse.json({ success: false, error: 'order_id required' }, { status: 400 });
  }

  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Catalog not configured' }, { status: 503 });
  }

  const res = await fetch(
    `${JLO_BASE}/.netlify/functions/customer-gift-order?order_id=${encodeURIComponent(orderId)}`,
    { headers: { Authorization: auth } }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
