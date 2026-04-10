import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/vendor/[id]
 *
 * Returns vendor info + their products by proxying to the JLO catalog-products
 * Netlify function (which has its own Supabase service-role access).
 *
 * Runs server-side so JLO CORS restrictions don't apply.
 * [id] = WooCommerce numeric vendor ID.
 */

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  ''
).replace(/\/$/, '');

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wcVendorId = parseInt(id, 10);

  if (isNaN(wcVendorId)) {
    return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
  }

  if (!JLO_BASE) {
    return NextResponse.json(
      { vendor: null, products: [], total: 0, source: 'error', error: 'JLO catalog URL not configured' },
      { status: 503 }
    );
  }

  try {
    // status=all avoids WC "publish" vs Supabase "published" mismatches
    const url =
      `${JLO_BASE}/.netlify/functions/catalog-products` +
      `?woo_vendor_id=${wcVendorId}&per_page=100&status=all`;

    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      // short cache — vendor pages are browsed frequently
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { vendor: null, products: [], total: 0, source: 'error' },
        { status: res.status }
      );
    }

    const body = await res.json();

    if (!body.success || !Array.isArray(body.data) || body.data.length === 0) {
      return NextResponse.json({ vendor: null, products: [], total: 0, source: 'supabase' });
    }

    // Extract vendor info from the first row's nested vendor object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstRow = body.data[0] as any;
    const vendorRow = firstRow?.vendor ?? null;
    const vendor = vendorRow
      ? {
          id:               wcVendorId,
          store_name:       vendorRow.store_name ?? `Vendor ${wcVendorId}`,
          store_logo:       vendorRow.logo_url   ?? null,
          banner:           vendorRow.banner_url  ?? null,
          shop_description: vendorRow.description ?? null,
          email:            vendorRow.email        ?? null,
          phone:            vendorRow.phone        ?? null,
          is_active:        true,
          store_slug:       vendorRow.store_slug  ?? '',
          store_url:        `/vendor/${wcVendorId}`,
        }
      : null;

    // Map catalog rows → Product shape expected by the vendor page
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allProducts = body.data.map((p: any) => {
      const regularPrice = String(p.regular_price ?? p.min_price ?? '');
      const salePrice    = p.sale_price ? String(p.sale_price) : '';
      const price        = salePrice || regularPrice || String(p.price ?? '');

      const images = Array.isArray(p.images)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? p.images.map((img: any) => ({ id: 0, src: img.src ?? '', alt: img.alt ?? '', name: '' }))
        : [];

      return {
        id:            Number(p.woo_product_id ?? p.id ?? 0),
        supabase_id:   p.id,
        name:          p.name ?? '',
        sku:           p.sku  ?? '',
        slug:          p.slug ?? '',
        type:          p.type ?? 'simple',
        short_description: p.short_description ?? '',
        price,
        regular_price: regularPrice,
        sale_price:    salePrice,
        on_sale:       Boolean(salePrice && salePrice !== regularPrice),
        stock_status:  p.stock_status ?? 'instock',
        status:        p.status ?? 'publish',
        images,
        categories:    Array.isArray(p.categories) ? p.categories : [],
        tags:          Array.isArray(p.tags)        ? p.tags        : [],
        average_rating: '0',
        rating_count:  0,
        date_created:  p.created_at ?? '',
        store: vendor
          ? { id: wcVendorId, name: vendor.store_name, shop_name: vendor.store_name, url: `/vendor/${wcVendorId}`, address: {} }
          : undefined,
      };
    });

    // Only show published products
    const products = allProducts.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.status === 'publish' || p.status === 'published'
    );

    return NextResponse.json({
      vendor,
      products,
      total: products.length,
      source: 'supabase',
    });

  } catch (err) {
    console.error('[/api/vendor] error:', err);
    return NextResponse.json(
      { vendor: null, products: [], total: 0, source: 'error' },
      { status: 500 }
    );
  }
}
