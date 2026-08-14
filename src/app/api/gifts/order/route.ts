import { NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Catalog not configured' }, { status: 503 });
  }

  const body = await request.json();

  const jloRes = await fetch(`${JLO_BASE}/api/create-gift-order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const jloData = await jloRes.json();

  if (!jloRes.ok || !jloData.success) {
    return NextResponse.json(
      { error: jloData.error || jloData.message || 'Failed to create gift order', detail: jloData.detail },
      { status: jloRes.status === 400 ? 400 : 500 }
    );
  }

  const d = jloData.data;
  return NextResponse.json(
    {
      id: d.order_id,
      order_number: d.order_number,
      payment_reference: d.payment_reference,
      total_amount: d.total_amount,
      subtotal: d.subtotal,
      shipping_fee: d.shipping_fee,
    },
    { status: 201 }
  );
}
