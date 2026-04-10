/**
 * GET /api/vendor-catalog/[id]
 *
 * Server-side proxy: fetches a vendor's products from the JLO Supabase catalog
 * (via catalog-products Netlify function) and maps them to the WC Product shape.
 *
 * Runs server-side only, so JLO CORS restrictions don't apply.
 * The vendor [id] must be the WooCommerce numeric vendor ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Product } from '@/types/product';

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  ''
).replace(/\/$/, '');

/**
 * Maps a normalized row from catalog-products.js to the WC Product shape.
 * The Netlify function already normalises images/categories/tags/vendor into
 * top-level fields, so this is purely a field-rename / default-fill operation.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizedRowToProduct(p: any): Product {
  const regular_price = String(p.regular_price ?? p.min_price ?? '');
  const sale_price    = p.sale_price ? String(p.sale_price) : '';
  const price         = sale_price || regular_price || String(p.price ?? p.min_price ?? '');

  const images = Array.isArray(p.images)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? p.images.map((img: any) => ({
        id: 0,
        date_created: '',
        date_modified: '',
        src: img.src ?? '',
        name: img.name ?? '',
        alt: img.alt ?? '',
      }))
    : [];

  const categories = Array.isArray(p.categories)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? p.categories.map((c: any) => ({ id: c.id ?? 0, name: c.name ?? '', slug: c.slug ?? '' }))
    : [];

  const tags = Array.isArray(p.tags)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? p.tags.map((t: any) => ({ id: t.id ?? 0, name: t.name ?? '', slug: t.slug ?? '' }))
    : [];

  const vendor = p.vendor ?? null;
  const wooVendorId = Number(vendor?.woocommerce_vendor_id ?? 0);

  return {
    id: Number(p.woo_product_id ?? p.id ?? 0),
    name: p.name ?? '',
    slug: p.slug ?? '',
    permalink: '',
    date_created: p.created_at ?? '',
    date_modified: p.updated_at ?? p.created_at ?? '',
    type: p.type ?? 'simple',
    status: 'publish' as Product['status'],
    featured: false,
    catalog_visibility: 'visible',
    description: p.description ?? '',
    short_description: p.short_description ?? '',
    sku: p.sku ?? '',
    price,
    regular_price,
    sale_price,
    date_on_sale_from: null,
    date_on_sale_to: null,
    price_html: '',
    on_sale: Boolean(sale_price && sale_price !== regular_price),
    purchasable: true,
    total_sales: 0,
    virtual: Boolean(p.is_virtual),
    downloadable: false,
    external_url: '',
    button_text: '',
    tax_status: 'taxable',
    tax_class: '',
    manage_stock: Boolean(p.manage_stock),
    stock_quantity: p.stock_quantity != null ? Number(p.stock_quantity) : null,
    stock_status: (p.stock_status as Product['stock_status']) ?? 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    sold_individually: false,
    weight: null,
    dimensions: { length: '', width: '', height: '' },
    shipping_required: !p.is_virtual,
    shipping_taxable: true,
    shipping_class: '',
    shipping_class_id: 0,
    reviews_allowed: true,
    average_rating: '0',
    rating_count: 0,
    related_ids: [],
    upsell_ids: [],
    cross_sell_ids: [],
    parent_id: 0,
    purchase_note: '',
    categories,
    tags,
    images,
    attributes: [],
    default_attributes: [],
    variations: [],
    grouped_products: [],
    menu_order: 0,
    meta_data: [],
    store: wooVendorId
      ? {
          id: wooVendorId,
          name: vendor?.store_name ?? `Vendor ${wooVendorId}`,
          shop_name: vendor?.store_name ?? `Vendor ${wooVendorId}`,
          url: `/vendor/${wooVendorId}`,
          address: {},
        }
      : undefined,
  } as unknown as Product;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!JLO_BASE) {
    return NextResponse.json(
      { success: false, error: 'JLO catalog URL not configured', products: [], total: 0 },
      { status: 503 }
    );
  }

  const { id } = params;
  const numericId = parseInt(id, 10);
  if (!numericId || isNaN(numericId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid vendor ID', products: [], total: 0 },
      { status: 400 }
    );
  }

  // status=all avoids format mismatches between WC "publish" and Supabase "published"
  const catalogUrl =
    `${JLO_BASE}/.netlify/functions/catalog-products` +
    `?woo_vendor_id=${encodeURIComponent(id)}&per_page=100&status=all`;

  try {
    const res = await fetch(catalogUrl, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Catalog returned ${res.status}`, products: [], total: 0 },
        { status: res.status }
      );
    }

    const body = await res.json();
    if (!body.success || !Array.isArray(body.data)) {
      return NextResponse.json({ success: false, products: [], total: 0 });
    }

    // Map and filter to published products only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products: Product[] = body.data
      .filter((row: any) => row.status === 'published' || row.status === 'publish')
      .map(normalizedRowToProduct);

    // Extract vendor info from first row for the store header
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstRow = body.data[0] as any;
    const vendorRow = firstRow?.vendor ?? null;
    const vendor = vendorRow
      ? {
          id: Number(vendorRow.woocommerce_vendor_id ?? numericId),
          store_name: vendorRow.store_name ?? `Vendor ${numericId}`,
          store_slug: vendorRow.store_slug ?? '',
          store_url: `/vendor/${vendorRow.woocommerce_vendor_id ?? numericId}`,
          vendor_display_name: vendorRow.store_name ?? '',
          vendor_shop_name: vendorRow.store_name ?? '',
          enabled: true,
        }
      : null;

    return NextResponse.json({
      success: true,
      vendor,
      products,
      total: products.length,
      total_pages: 1,
    });
  } catch (err) {
    console.error('[vendor-catalog] fetch error:', err);
    return NextResponse.json(
      { success: false, error: String(err), products: [], total: 0 },
      { status: 500 }
    );
  }
}
