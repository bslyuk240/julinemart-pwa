/**
 * Supabase Catalog Client — SERVER-SIDE ONLY
 *
 * Calls JLO Netlify functions which serve product data from Supabase.
 * Must never run in the browser (CORS is locked to production domain).
 * A runtime guard in jloFetch() returns null immediately in the browser
 * so client components fall through to the WooCommerce fallback.
 * The JLO backend site URL must be set via NEXT_PUBLIC_JLO_CATALOG_URL.
 *
 * All functions return null/[] on any error so callers can fall back to WooCommerce.
 */

import type { Product, ProductVariation, ProductsQueryParams } from '@/types/product';

function getJloCatalogBase(): string | null {
  const url =
    process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
    process.env.JLO_API_BASE_URL ||
    null;
  return url ? url.replace(/\/$/, '') : null;
}

async function jloFetch<T>(path: string): Promise<T | null> {
  // Never run in the browser — JLO CORS is locked to production domain.
  // Client components will get null and fall back to WooCommerce.
  if (typeof window !== 'undefined') return null;

  const base = getJloCatalogBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}${path}`, {
      next: { revalidate: 300 },
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// JLO functions return { success, data, meta } for lists and { success, data } for single
interface JloListResponse { success: boolean; data: unknown[]; meta?: unknown }
interface JloSingleResponse { success: boolean; data: unknown }

// ---------------------------------------------------------------------------
// Row → WC Product mapper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWcProduct(row: any): Product {
  // Derive price: prefer sale_price, else regular_price, else sourcing_meta NGN snapshot
  const snapshotNgn = row.sourcing_meta?.final_price_snapshot_ngn
    ?? row.sourcing_meta?.landed_cost_snapshot_ngn
    ?? null;
  const regularPrice = row.regular_price
    ? String(row.regular_price)
    : snapshotNgn ? String(snapshotNgn) : '';
  const salePrice = row.sale_price ? String(row.sale_price) : '';
  const price = salePrice || regularPrice;
  const onSale = Boolean(salePrice && salePrice !== regularPrice);

  // Map "published" → "publish" to match WC status enum
  const rawStatus = row.status ?? 'publish';
  const status = rawStatus === 'published' ? 'publish' : rawStatus;

  // Normalise categories: filter out vendor/hub entries (those have store_name not name)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = Array.isArray(row.categories)
    ? row.categories
        .filter((c: any) => c.name && c.slug)
        .map((c: any) => ({
          id: typeof c.id === 'number' ? c.id : 0,
          name: c.name,
          slug: c.slug,
        }))
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tags = Array.isArray(row.tags)
    ? row.tags.map((t: any) => ({
        id: typeof t.id === 'number' ? t.id : 0,
        name: t.name ?? '',
        slug: t.slug ?? '',
      }))
    : [];

  // Normalise images: Supabase has { id(uuid), src, alt, position, is_thumbnail }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const images = Array.isArray(row.images)
    ? row.images.map((img: any) => ({
        id: typeof img.id === 'number' ? img.id : 0,
        date_created: img.date_created ?? '',
        date_modified: img.date_modified ?? '',
        src: img.src ?? '',
        name: img.name ?? '',
        alt: img.alt ?? '',
      }))
    : [];

  return {
    supabaseId: row.id ?? undefined,
    // Use woo_product_id as the numeric WC id; fall back to wc_id or 0
    id: Number(row.woo_product_id ?? row.wc_id ?? row.id ?? 0),
    name: row.name ?? '',
    slug: row.slug ?? '',
    permalink: row.permalink ?? '',
    date_created: row.date_created ?? row.created_at ?? '',
    date_modified: row.date_modified ?? row.updated_at ?? '',
    type: row.type ?? 'simple',
    status: status as Product['status'],
    featured: Boolean(row.featured),
    catalog_visibility: row.catalog_visibility ?? 'visible',
    description: row.description ?? '',
    short_description: row.short_description ?? '',
    sku: row.sku ?? '',
    price,
    regular_price: regularPrice,
    sale_price: salePrice,
    date_on_sale_from: row.date_on_sale_from ?? null,
    date_on_sale_to: row.date_on_sale_to ?? null,
    price_html: row.price_html ?? '',
    on_sale: onSale,
    purchasable: row.purchasable !== false,
    total_sales: Number(row.total_sales ?? 0),
    virtual: Boolean(row.is_virtual ?? row.virtual),
    downloadable: Boolean(row.downloadable),
    external_url: row.external_url ?? '',
    button_text: row.button_text ?? '',
    tax_status: row.tax_status ?? 'taxable',
    tax_class: row.tax_class ?? '',
    manage_stock: Boolean(row.manage_stock),
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    stock_status: row.stock_status ?? 'instock',
    backorders: row.backorders ?? 'no',
    backorders_allowed: Boolean(row.backorders_allowed),
    backordered: Boolean(row.backordered),
    sold_individually: Boolean(row.sold_individually),
    weight: row.weight ?? null,
    dimensions: row.dimensions ?? { length: '', width: '', height: '' },
    shipping_required: row.shipping_required !== false,
    shipping_taxable: row.shipping_taxable !== false,
    shipping_class: row.shipping_class ?? '',
    shipping_class_id: Number(row.shipping_class_id ?? 0),
    reviews_allowed: row.reviews_allowed !== false,
    average_rating: String(row.average_rating ?? '0'),
    rating_count: Number(row.rating_count ?? 0),
    related_ids: Array.isArray(row.related_ids) ? row.related_ids : [],
    upsell_ids: Array.isArray(row.upsell_ids) ? row.upsell_ids : [],
    cross_sell_ids: Array.isArray(row.cross_sell_ids) ? row.cross_sell_ids : [],
    parent_id: Number(row.parent_id ?? 0),
    purchase_note: row.purchase_note ?? '',
    categories,
    tags,
    brands: Array.isArray(row.brands) ? row.brands : undefined,
    images,
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    default_attributes: Array.isArray(row.default_attributes) ? row.default_attributes : [],
    variations: Array.isArray(row.variations) ? row.variations.map(Number) : [],
    grouped_products: Array.isArray(row.grouped_products) ? row.grouped_products : [],
    menu_order: Number(row.menu_order ?? 0),
    meta_data: Array.isArray(row.meta_data) ? row.meta_data : [],
    store: (() => {
      if (row.store) return row.store;
      // Supabase data has a nested vendor object: { id, store_name, store_slug, woocommerce_vendor_id }
      const vendor = row.vendor;
      const vendorId = Number(vendor?.woocommerce_vendor_id ?? row.woocommerce_vendor_id ?? row.wc_vendor_id ?? 0);
      if (!vendorId) return undefined;
      return {
        id: vendorId,
        name: vendor?.store_name ?? `Vendor ${vendorId}`,
        shop_name: vendor?.store_name ?? `Vendor ${vendorId}`,
        url: `/vendor/${vendorId}`,
        address: {},
      };
    })(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWcVariation(row: any): ProductVariation {
  const regularPrice = String(row.regular_price ?? '');
  const salePrice = row.sale_price ? String(row.sale_price) : '';
  return {
    supabaseId: row.id ?? undefined,
    id: Number(row.woo_product_id ?? row.wc_id ?? row.id ?? 0),
    sku: row.sku ?? '',
    price: salePrice || regularPrice,
    regular_price: regularPrice,
    sale_price: salePrice,
    on_sale: Boolean(salePrice && salePrice !== regularPrice),
    stock_status: row.stock_status ?? 'instock',
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    manage_stock: Boolean(row.manage_stock),
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    image: row.image ?? (Array.isArray(row.images) ? row.images[0] : undefined),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function buildProductsQS(params: ProductsQueryParams): string {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.per_page) qs.set('per_page', String(params.per_page));
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', String(params.category));
  if (params.tag) qs.set('tag', String(params.tag));
  if (params.slug) qs.set('slug', params.slug);
  if (params.status) qs.set('status', params.status);
  if (params.featured !== undefined) qs.set('featured', String(params.featured));
  if (params.on_sale !== undefined) qs.set('on_sale', String(params.on_sale));
  if (params.min_price) qs.set('min_price', params.min_price);
  if (params.max_price) qs.set('max_price', params.max_price);
  if (params.stock_status) qs.set('stock_status', params.stock_status);
  if (params.orderby) qs.set('orderby', params.orderby);
  if (params.order) qs.set('order', params.order);
  if (params.woo_vendor_id) qs.set('woo_vendor_id', String(params.woo_vendor_id));
  return qs.toString();
}

export async function catalogGetProductsWithMeta(
  params: ProductsQueryParams = {}
): Promise<{ products: Product[]; total: number; totalPages: number } | null> {
  const qs = buildProductsQS(params);
  const path = `/.netlify/functions/catalog-products${qs ? `?${qs}` : ''}`;
  const resp = await jloFetch<JloListResponse>(path);
  if (!resp?.success || !Array.isArray(resp.data) || resp.data.length === 0) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = resp.meta as any;
  return {
    products: resp.data.map(toWcProduct),
    total: Number(meta?.total ?? resp.data.length),
    totalPages: Number(meta?.total_pages ?? 1),
  };
}

export async function catalogGetProducts(
  params: ProductsQueryParams = {}
): Promise<Product[] | null> {
  const qs = buildProductsQS(params);
  const path = `/.netlify/functions/catalog-products${qs ? `?${qs}` : ''}`;
  const resp = await jloFetch<JloListResponse>(path);
  if (!resp?.success || !Array.isArray(resp.data) || resp.data.length === 0) return null;
  return resp.data.map(toWcProduct);
}

export async function catalogGetProduct(slug: string): Promise<Product | null> {
  const resp = await jloFetch<JloSingleResponse>(
    `/.netlify/functions/catalog-product?slug=${encodeURIComponent(slug)}`
  );
  if (!resp?.success || !resp.data) return null;
  return toWcProduct(resp.data);
}

export async function catalogGetVariations(
  productId: number
): Promise<ProductVariation[] | null> {
  const resp = await jloFetch<JloListResponse>(
    `/.netlify/functions/catalog-variations?product_id=${productId}`
  );
  if (!resp?.success || !Array.isArray(resp.data) || resp.data.length === 0) return null;
  return resp.data.map(toWcVariation);
}
