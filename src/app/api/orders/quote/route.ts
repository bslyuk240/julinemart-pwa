import { NextResponse } from 'next/server';

/**
 * Checkout totals preview with JulinePoints. Forwards a compact cart to JLO's
 * create-order in quote-only mode: nothing is written, and JLO re-prices the
 * items itself (the browser's prices are never used). The customer's own
 * Authorization header is forwarded so JLO can verify who is asking.
 */
const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!JLO_BASE || items.length === 0) {
      return NextResponse.json({ error: 'Invalid quote request' }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      quote_only: true,
      items: items.map((i: any) => ({
        product_id: i.product_id,
        variation_id: i.variation_id,
        quantity: i.quantity,
        ...(i.customisation ? { customisation: i.customisation } : {}),
      })),
      shipping_fee: 0,
    };
    if (typeof body.voucher_code === 'string' && body.voucher_code.trim()) {
      payload.voucher_code = body.voucher_code.trim().toUpperCase();
    }
    if (typeof body.influencer_coupon_code === 'string' && body.influencer_coupon_code.trim()) {
      payload.influencer_coupon_code = body.influencer_coupon_code.trim().toUpperCase();
    }
    if (body.points_use_max === true) payload.points_use_max = true;
    else if (Number.isInteger(body.points_to_redeem) && body.points_to_redeem > 0) {
      payload.points_to_redeem = body.points_to_redeem;
    }

    const authorization = request.headers.get('authorization');
    const res = await fetch(`${JLO_BASE}/api/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success || !data.quote) {
      return NextResponse.json(
        { error: data.error || 'Could not get a quote', code: data.code },
        { status: [400, 401, 409, 503].includes(res.status) ? res.status : 500 },
      );
    }
    return NextResponse.json(data.quote);
  } catch {
    return NextResponse.json({ error: 'Could not get a quote' }, { status: 500 });
  }
}
