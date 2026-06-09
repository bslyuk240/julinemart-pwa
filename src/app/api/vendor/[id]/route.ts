import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const revalidate = 300; // Cache vendor pages for 5 minutes

/**
 * GET /api/vendor/[id]
 *
 * Returns vendor info + their products by proxying to the JLO catalog-products
 * Netlify function (which has its own Supabase service-role access).
 *
 * Runs server-side so JLO CORS restrictions don't apply.
 * [id] = WooCommerce numeric vendor user id, or JLO `jlo-{uuid}` (vendors.woocommerce_vendor_id).
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
  const url = new URL(_req.url);
  const page = Math.max(Number(url.searchParams.get('page') || 1), 1);
  const perPage = Math.min(Math.max(Number(url.searchParams.get('per_page') || 24), 1), 100);
  const { id: rawParam } = await params;
  const WooKey = decodeURIComponent(String(rawParam ?? '')).trim();
  if (!WooKey) {
    return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
  }

  if (!JLO_BASE) {
    return NextResponse.json(
      { vendor: null, products: [], total: 0, source: 'error', error: 'JLO catalog URL not configured' },
      { status: 503 }
    );
  }

  try {
    // Filter server-side to published only so pagination never buries them
    const catalogProductsUrl =
      `${JLO_BASE}/.netlify/functions/catalog-products` +
      `?woo_vendor_id=${encodeURIComponent(WooKey)}&page=${page}&per_page=${perPage}&status=published`;

    const res = await fetch(catalogProductsUrl, {
      headers: { 'Content-Type': 'application/json' },
      // cache the first page a bit longer; vendor pages are browsed frequently
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { vendor: null, products: [], total: 0, source: 'error' },
        { status: res.status }
      );
    }

    const body = await res.json();

    if (!body.success || !Array.isArray(body.data) || body.data.length === 0) {
      const meta = body?.meta ?? null;
      return NextResponse.json({
        vendor: null,
        products: [],
        total: Number(meta?.total ?? 0),
        totalPages: Number(meta?.total_pages ?? 0),
        page,
        perPage,
        source: 'supabase',
      });
    }

    // Extract vendor info from the first row's nested vendor object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstRow = body.data[0] as any;
    const vendorRow = firstRow?.vendor ?? null;

    // Fetch vendor rating from product_reviews using the vendor's UUID
    let vendorRating: { avg: string; count: number } | null = null;
    const vendorUuid: string | null = vendorRow?.id ?? null;
    if (vendorUuid) {
      try {
        const supabase = getSupabaseServerClient();
        const { data: ratingData } = await supabase
          .from('product_reviews')
          .select('rating')
          .eq('vendor_id', vendorUuid)
          .eq('status', 'approved');
        if (ratingData && ratingData.length > 0) {
          const avg = ratingData.reduce((s, r) => s + Number(r.rating), 0) / ratingData.length;
          vendorRating = { avg: avg.toFixed(1), count: ratingData.length };
        }
      } catch {
        // non-fatal — vendor page just shows "No ratings"
      }
    }

    const vendor = vendorRow
      ? {
          id: WooKey,
          store_name: vendorRow.store_name ?? `Vendor ${WooKey}`,
          store_logo: vendorRow.logo_url ?? null,
          banner: vendorRow.banner_url ?? null,
          shop_description: vendorRow.description ?? null,
          email: vendorRow.email ?? null,
          phone: vendorRow.phone ?? null,
          is_active: true,
          store_slug: vendorRow.store_slug ?? '',
          store_url: `/vendor/${WooKey}`,
          rating: vendorRating ?? undefined,
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
        average_rating: String(p.average_rating ?? '0'),
        rating_count:  Number(p.rating_count ?? 0),
        date_created:  p.created_at ?? '',
        store: vendor
          ? { id: WooKey, name: vendor.store_name, shop_name: vendor.store_name, url: `/vendor/${WooKey}`, address: {} }
          : undefined,
      };
    });

    // Only show published products
    const products = allProducts.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.status === 'publish' || p.status === 'published'
    );

    return NextResponse.json(
      {
        vendor,
        products,
        total: Number(body?.meta?.total ?? products.length),
        totalPages: Number(body?.meta?.total_pages ?? 1),
        page,
        perPage,
        source: 'supabase',
      },
      {
        headers: {
          // Allow the browser to serve from cache for 5 min; revalidate in background after
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );

  } catch (err) {
    console.error('[/api/vendor] error:', err);
    return NextResponse.json(
      { vendor: null, products: [], total: 0, source: 'error' },
      { status: 500 }
    );
  }
}
