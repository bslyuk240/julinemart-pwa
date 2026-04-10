import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/vendor/[id]
 *
 * Returns vendor info + their products entirely from Supabase.
 * [id] = WooCommerce vendor ID (numeric string)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wcVendorId = parseInt(id, 10);

  if (isNaN(wcVendorId)) {
    return NextResponse.json({ error: 'Invalid vendor ID' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseServerClient();

    // ── 1. Look up vendor by WC vendor ID ────────────────────────────────────
    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('id, store_name, email, phone, description, logo_url, banner_url, is_active')
      .eq('woocommerce_vendor_id', wcVendorId)
      .maybeSingle();

    if (vendorErr) {
      console.error('Supabase vendor lookup error:', vendorErr);
    }

    if (!vendor) {
      return NextResponse.json({ vendor: null, products: [], total: 0, source: 'supabase' });
    }

    // ── 2. Get products with images from Supabase ─────────────────────────────
    const { data: rows, count } = await supabase
      .from('products')
      .select(
        'id, name, sku, slug, regular_price, sale_price, stock_status, woo_product_id, type, short_description, ' +
        'product_images(src, alt, position, is_thumbnail)',
        { count: 'exact' }
      )
      .eq('vendor_id', vendor.id)
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false });

    // ── 3. Shape products ─────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = (rows || []).map((sp: any) => {
      const sortedImgs = (sp.product_images || []).sort(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any, b: any) => a.position - b.position
      );
      const images = sortedImgs.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (img: any) => ({ id: 0, src: img.src, alt: img.alt || '', name: '' })
      );

      const price = sp.sale_price ?? sp.regular_price ?? '0';

      return {
        id:            sp.woo_product_id || sp.id,
        supabase_id:   sp.id,
        name:          sp.name,
        sku:           sp.sku,
        slug:          sp.slug,
        type:          sp.type,
        short_description: sp.short_description,
        price:         String(price),
        regular_price: String(sp.regular_price ?? ''),
        sale_price:    sp.sale_price ? String(sp.sale_price) : '',
        on_sale:       Boolean(sp.sale_price && sp.sale_price !== sp.regular_price),
        stock_status:  sp.stock_status || 'instock',
        images,
        categories:    [],
        average_rating: '0',
        rating_count:  0,
        date_created:  sp.created_at || '',
        store: {
          id:        wcVendorId,
          name:      vendor.store_name,
          shop_name: vendor.store_name,
          url:       `/vendor/${wcVendorId}`,
          address:   {},
        },
      };
    });

    return NextResponse.json({
      vendor: {
        id:               wcVendorId,
        store_name:       vendor.store_name,
        store_logo:       vendor.logo_url,
        banner:           vendor.banner_url,
        shop_description: vendor.description,
        email:            vendor.email,
        phone:            vendor.phone,
        is_active:        vendor.is_active,
        store_slug:       '',
        store_url:        `/vendor/${wcVendorId}`,
      },
      products,
      total: count ?? products.length,
      source: 'supabase',
    });

  } catch (err) {
    console.error('vendor API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
