import { NextRequest, NextResponse } from 'next/server';
import { getProductsWithPagination } from '@/lib/woocommerce/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, any> = {};
  if (searchParams.get('per_page')) params.per_page = Number(searchParams.get('per_page'));
  if (searchParams.get('page')) params.page = Number(searchParams.get('page'));
  if (searchParams.get('offset')) params.offset = Number(searchParams.get('offset'));
  if (searchParams.get('orderby')) params.orderby = searchParams.get('orderby');
  if (searchParams.get('order')) params.order = searchParams.get('order');
  if (searchParams.get('tag')) params.tag = searchParams.get('tag');
  if (searchParams.get('category')) params.category = searchParams.get('category');
  if (searchParams.get('search')) params.search = searchParams.get('search');
  if (searchParams.get('featured')) params.featured = searchParams.get('featured') === 'true';
  if (searchParams.get('on_sale')) params.on_sale = searchParams.get('on_sale') === 'true';
  if (searchParams.get('min_price')) params.min_price = searchParams.get('min_price');
  if (searchParams.get('max_price')) params.max_price = searchParams.get('max_price');
  if (searchParams.get('stock_status')) params.stock_status = searchParams.get('stock_status');
  if (searchParams.get('woo_vendor_id')) params.woo_vendor_id = searchParams.get('woo_vendor_id');

  const result = await getProductsWithPagination(params);
  const varies =
    Boolean(searchParams.get('category')) ||
    Boolean(searchParams.get('tag')) ||
    Boolean(searchParams.get('search'));
  return NextResponse.json(result, {
    headers: {
      // Category/tag/search must not share a cached response across query strings at the edge.
      'Cache-Control': varies
        ? 'private, no-store, must-revalidate'
        : 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
