import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id')?.trim();
  const wooId = searchParams.get('woo_id')?.trim();
  const slug = searchParams.get('slug')?.trim();

  if (!JLO_BASE) {
    return NextResponse.json({ error: 'Catalog not configured' }, { status: 503 });
  }
  if (!id && !wooId && !slug) {
    return NextResponse.json({ error: 'Provide id, woo_id, or slug' }, { status: 400 });
  }

  const qs = new URLSearchParams();
  if (id) qs.set('id', id);
  else if (wooId) qs.set('woo_id', wooId);
  else if (slug) qs.set('slug', slug);

  try {
    const res = await fetch(
      `${JLO_BASE}/.netlify/functions/catalog-product?${qs}`,
      { cache: 'no-store' }
    );
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return NextResponse.json(
        { error: json?.error || 'Product not found' },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    return NextResponse.json({ product: json.data });
  } catch {
    return NextResponse.json({ error: 'Failed to load product' }, { status: 502 });
  }
}
