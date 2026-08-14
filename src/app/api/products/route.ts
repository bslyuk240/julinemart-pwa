import { NextRequest, NextResponse } from 'next/server';
import { getProductsWithPagination } from '@/lib/woocommerce/products';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const params: Record<string, any> = {};
  const perPage = Math.min(Math.max(Number(searchParams.get('per_page')) || 100, 1), 100);
  const page = Math.max(Number(searchParams.get('page')) || 1, 1);
  params.per_page = perPage;
  params.page = page;
  const includeParam = searchParams.get('include');
  if (includeParam) {
    const include = includeParam
      .split(',')
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (include.length) params.include = include;
  }
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
  if (searchParams.get('near_state')) params.near_state = searchParams.get('near_state')!;
  if (searchParams.get('near_city')) params.near_city = searchParams.get('near_city')!;
  if (searchParams.get('near_area')) params.near_area = searchParams.get('near_area')!;
  if (searchParams.get('pickup_available') === 'true') params.pickup_available = true;

  const result = await getProductsWithPagination(params);
  return NextResponse.json(result, {
    headers: {
      // Product lists vary by page, sort, and filters — do not cache at shared caches.
      'Cache-Control': 'private, no-store, must-revalidate',
    },
  });
}
