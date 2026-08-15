import { NextResponse } from 'next/server';
import { fetchJloFunction } from '@/lib/jlo/proxy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('product_id')?.trim();
  if (!productId) {
    return NextResponse.json({ success: false, error: 'product_id required' }, { status: 400 });
  }

  const result = await fetchJloFunction<{
    success: boolean;
    data?: {
      schema_id: string;
      product_id: string;
      fields: unknown[];
      production_days_min?: number | null;
      production_days_max?: number | null;
    };
    error?: string;
  }>(`gift-product-customisation?product_id=${encodeURIComponent(productId)}`);

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status });
  }

  const payload = result.data;
  if (!payload?.success) {
    return NextResponse.json(
      { success: false, error: payload?.error || 'Schema not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: payload.data });
}
