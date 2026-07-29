import { NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (!JLO_BASE) {
    return NextResponse.json({ success: false, error: 'Service not configured' }, { status: 503 });
  }

  try {
    const jloRes = await fetch(`${JLO_BASE}/.netlify/functions/cancel-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: id, reason: body.reason }),
    });

    const data = await jloRes.json();
    return NextResponse.json(data, { status: jloRes.status });
  } catch (err: any) {
    console.error('cancel-order proxy error:', err);
    return NextResponse.json({ success: false, error: 'Failed to cancel order' }, { status: 500 });
  }
}
