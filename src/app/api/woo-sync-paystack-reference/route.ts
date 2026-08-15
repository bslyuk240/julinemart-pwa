import { NextResponse } from 'next/server';

/** Legacy WooCommerce Paystack sync — orders now live in Supabase/JLO only. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const orderId = body?.orderId;
  const reference = body?.reference;

  if (!orderId || !reference) {
    return NextResponse.json(
      { success: false, error: 'orderId and reference are required' },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    orderId,
    reference,
    skipped: true,
    message: 'WooCommerce sync retired — Paystack reference is stored on Supabase orders at checkout.',
  });
}
