import { NextResponse } from 'next/server';
import { toWcProduct } from '@/lib/catalog/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = Number(searchParams.get('product_id') || 0);

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: 'Valid product_id is required' }, { status: 400 });
  }

  const base =
    process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
    process.env.JLO_API_BASE_URL ||
    null;

  if (!base) {
    return NextResponse.json({ variations: [] });
  }

  try {
    const url = `${base.replace(/\/$/, '')}/.netlify/functions/catalog-product?woo_id=${encodeURIComponent(
      String(productId)
    )}`;

    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      return NextResponse.json({ variations: [] });
    }

    const payload = (await response.json()) as {
      success?: boolean;
      data?: unknown;
    };

    if (!payload?.success || !payload.data) {
      return NextResponse.json({ variations: [] });
    }

    const mapped = toWcProduct(payload.data);
    return NextResponse.json({ variations: mapped._variations ?? [] });
  } catch {
    return NextResponse.json({ variations: [] });
  }
}
