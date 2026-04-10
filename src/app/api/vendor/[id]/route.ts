import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/vendor/[id]
 *
 * Returns vendor info + their correctly attributed products from Supabase.
 * Falls back to WooCommerce for product images/pricing enrichment.
 *
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

    // ── 1. Look up vendor in Supabase by WC vendor ID ──────────────────────
    const { data: vendor, error: vendorErr } = await supabase
      .from('vendors')
      .select('id, store_name, email, phone, description, logo_url, banner_url, commission_rate, is_active')
      .eq('woocommerce_vendor_id', wcVendorId)
      .maybeSingle();

    if (vendorErr) {
      console.error('Supabase vendor lookup error:', vendorErr);
    }

    // ── 2. Get correctly attributed products from Supabase ──────────────────
    let products: Record<string, unknown>[] = [];
    let total = 0;

    if (vendor) {
      const { data: supabaseProducts, count } = await supabase
        .from('products')
        .select('id, name, sku, regular_price, sale_price, status, woo_product_id, slug, product_images(src, alt, position, is_thumbnail)', { count: 'exact' })
        .eq('vendor_id', vendor.id)
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false });

      total = count ?? 0;

      // ── 3. Enrich with WooCommerce for images & full pricing ───────────────
      if (supabaseProducts && supabaseProducts.length > 0) {
        const wcIds = supabaseProducts.map(p => p.woo_product_id).filter(Boolean);

        if (wcIds.length > 0) {
          try {
            const wcBase = process.env.WC_BASE_URL || '';
            const wcKey  = process.env.WC_CONSUMER_KEY || '';
            const wcSec  = process.env.WC_CONSUMER_SECRET || '';

            // Batch fetch from WooCommerce (max 100 per request)
            const batchSize = 100;
            const wcProductMap: Record<number, Record<string, unknown>> = {};

            for (let i = 0; i < wcIds.length; i += batchSize) {
              const batch = wcIds.slice(i, i + batchSize);
              const wcUrl = `${wcBase}/products?include=${batch.join(',')}&per_page=${batchSize}&consumer_key=${wcKey}&consumer_secret=${wcSec}`;
              const wcRes = await fetch(wcUrl, { next: { revalidate: 300 } });
              if (wcRes.ok) {
                const wcData = await wcRes.json() as Array<Record<string, unknown>>;
                for (const p of wcData) {
                  wcProductMap[p.id as number] = p;
                }
              }
            }

            products = supabaseProducts.map(sp => {
              const wc = wcProductMap[sp.woo_product_id as number] || {};
              const price = wc.price ?? sp.sale_price ?? sp.regular_price;
              // Supabase images as primary fallback when WC has none
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const sbImages = ((sp as any).product_images || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .sort((a: any, b: any) => a.position - b.position)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((img: any) => ({ id: 0, src: img.src, alt: img.alt || '', name: '' }));
              const wcImages = Array.isArray(wc.images) && (wc.images as unknown[]).length > 0 ? wc.images : null;
              return {
                id:            sp.woo_product_id || sp.id,
                supabase_id:   sp.id,
                name:          sp.name,
                sku:           sp.sku,
                slug:          sp.slug || wc.slug,
                price:         price,
                regular_price: wc.regular_price  ?? sp.regular_price,
                sale_price:    wc.sale_price     ?? sp.sale_price,
                images:        wcImages ?? sbImages,
                categories:    wc.categories     ?? [],
                average_rating: wc.average_rating ?? '0',
                rating_count:  wc.rating_count   ?? 0,
                store: {
                  id:        wcVendorId,
                  name:      vendor.store_name,
                  shop_name: vendor.store_name,
                },
              };
            });
          } catch (wcErr) {
            console.error('WooCommerce enrichment error:', wcErr);
            // Fall back to Supabase-only data (use product_images from Supabase)
            products = supabaseProducts.map(sp => ({
              id:   sp.woo_product_id || sp.id,
              name: sp.name,
              sku:  sp.sku,
              slug: sp.slug,
              price: sp.sale_price ?? sp.regular_price,
              regular_price: sp.regular_price,
              sale_price:    sp.sale_price,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              images: ((sp as any).product_images || [])
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .sort((a: any, b: any) => a.position - b.position)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((img: any) => ({ id: 0, src: img.src, alt: img.alt || '', name: '' })),
              store: {
                id:        wcVendorId,
                name:      vendor.store_name,
                shop_name: vendor.store_name,
              },
            }));
          }
        }
      }

      return NextResponse.json({
        vendor: {
          id:          wcVendorId,
          store_name:  vendor.store_name,
          store_logo:  vendor.logo_url,
          banner:      vendor.banner_url,
          shop_description: vendor.description,
          email:       vendor.email,
          phone:       vendor.phone,
          is_active:   vendor.is_active,
          // Shape matches what vendor page expects
          store_slug:  '',
          store_url:   `/vendor/${wcVendorId}`,
        },
        products,
        total,
        source: 'supabase',
      });
    }

    // ── Fallback: vendor not in Supabase, proxy to WooCommerce ────────────────
    const wcBase = process.env.WC_BASE_URL || '';
    const wcKey  = process.env.WC_CONSUMER_KEY || '';
    const wcSec  = process.env.WC_CONSUMER_SECRET || '';
    const baseUrl = wcBase.replace('/wc/v3', '');

    const [vendorRes, productsRes] = await Promise.all([
      fetch(`${baseUrl}/wp-json/julinemart/v1/vendors/${wcVendorId}`),
      fetch(`${wcBase}/products?author=${wcVendorId}&status=publish&per_page=50&consumer_key=${wcKey}&consumer_secret=${wcSec}`),
    ]);

    const vendorWc  = vendorRes.ok  ? await vendorRes.json()  : null;
    const productsWc = productsRes.ok ? await productsRes.json() : [];

    return NextResponse.json({
      vendor:   vendorWc,
      products: productsWc,
      total:    productsWc.length,
      source:   'woocommerce',
    });

  } catch (err) {
    console.error('vendor API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
