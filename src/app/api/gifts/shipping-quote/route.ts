import { NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json();

  const result = await fetchJloFunction<{
    success: boolean;
    data?: { shipping: number; zone?: string; order_value?: number };
    error?: string;
  }>('gift-shipping-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  const payload = result.data;
  if (!payload?.success) {
    return NextResponse.json(
      { success: false, error: payload?.error || 'Shipping quote failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: payload.data });
}
