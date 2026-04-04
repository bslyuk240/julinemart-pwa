/**
 * Supabase Catalog Client
 *
 * Calls JLO Netlify functions which serve product data from Supabase.
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

// ---------------------------------------------------------------------------
// Row → WC Product mapper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWcProduct(row: any): Product {
  return {
    id: Number(row.wc_id ?? row.id ?? 0),
    name: row.name ?? '',
    slug: row.slug ?? '',
    permalink: row.permalink ?? '',
    date_created: row.date_created ?? '',
    date_modified: row.date_modified ?? '',
    type: row.type ?? 'simple',
    status: row.status ?? 'publish',
    featured: Boolean(row.featured),
    catalog_visibility: row.catalog_visibility ?? 'visible',
    description: row.description ?? '',
    short_description: row.short_description ?? '',
    sku: row.sku ?? '',
    price: String(row.price ?? ''),
    regular_price: String(row.regular_price ?? ''),
    sale_price: String(row.sale_price ?? ''),
    date_on_sale_from: row.date_on_sale_from ?? null,
    date_on_sale_to: row.date_on_sale_to ?? null,
    price_html: row.price_html ?? '',
    on_sale: Boolean(row.on_sale),
    purchasable: row.purchasable !== false,
    total_sales: Number(row.total_sales ?? 0),
    virtual: Boolean(row.virtual),
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
    categories: Array.isArray(row.categories) ? row.categories : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    brands: Array.isArray(row.brands) ? row.brands : undefined,
    images: Array.isArray(row.images) ? row.images : [],
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    default_attributes: Array.isArray(row.default_attributes) ? row.default_attributes : [],
    variations: Array.isArray(row.variations) ? row.variations : [],
    grouped_products: Array.isArray(row.grouped_products) ? row.grouped_products : [],
    menu_order: Number(row.menu_order ?? 0),
    meta_data: Array.isArray(row.meta_data) ? row.meta_data : [],
    store: row.store,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWcVariation(row: any): ProductVariation {
  return {
    id: Number(row.wc_id ?? row.id ?? 0),
    sku: row.sku ?? '',
    price: String(row.price ?? ''),
    regular_price: String(row.regular_price ?? ''),
    sale_price: String(row.sale_price ?? ''),
    on_sale: Boolean(row.on_sale),
    stock_status: row.stock_status ?? 'instock',
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    manage_stock: Boolean(row.manage_stock),
    attributes: Array.isArray(row.attributes) ? row.attributes : [],
    image: row.image,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function catalogGetProducts(
  params: ProductsQueryParams = {}
): Promise<Product[] | null> {
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

  const query = qs.toString();
  const path = `/.netlify/functions/catalog-products${query ? `?${query}` : ''}`;

  const data = await jloFetch<unknown[]>(path);
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return data.map(toWcProduct);
}

export async function catalogGetProduct(slug: string): Promise<Product | null> {
  const data = await jloFetch<unknown>(
    `/.netlify/functions/catalog-product?slug=${encodeURIComponent(slug)}`
  );
  if (!data) return null;
  return toWcProduct(data);
}

export async function catalogGetVariations(
  productId: number
): Promise<ProductVariation[] | null> {
  const data = await jloFetch<unknown[]>(
    `/.netlify/functions/catalog-variations?product_id=${productId}`
  );
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  return data.map(toWcVariation);
}
