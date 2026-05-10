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

import type { Product, ProductAttribute, ProductVariation, ProductsQueryParams } from '@/types/product';
import { resolveProductStoreFromCatalogRow } from '@/lib/catalog/product-store';

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
    // Storefront catalog must not serve stale rows after delete/unpublish (avoid Next Data Cache / SWR).
    const pathBase = path.split('?')[0];
    const isCatalogList =
      path.startsWith('/.netlify/functions/catalog-products') ||
      path.includes('/catalog-products?');
    const isCatalogProductDetail = pathBase === '/.netlify/functions/catalog-product';
    const res = await fetch(`${base}${path}`, {
      ...(isCatalogList || isCatalogProductDetail
        ? { cache: 'no-store' as const }
        : { next: { revalidate: 300 } }),
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

const normalizeVariationKey = (value: string) =>
  (value ?? '')
    .toLowerCase()
    .trim()
    .replace(/^attribute[_-]/, '')
    .replace(/^pa[_-]/, '')
    .replace(/^product[_-]/, '')
    .replace(/[^a-z0-9]+/g, '');

const dedupeOptions = (options: string[]) =>
  Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));

const stableNumericId = (value: string): number => {
  if (!value) return 0;

  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) || 0;
};

const inferAttributesFromVariations = (variations: ProductVariation[]): ProductAttribute[] => {
  const map = new Map<string, { name: string; options: string[] }>();

  variations.forEach((variation) => {
    variation.attributes.forEach((attr) => {
      const rawName = (attr.name ?? '').trim();
      const rawOption = (attr.option ?? '').trim();
      if (!rawName || !rawOption) return;

      const key = normalizeVariationKey(rawName);
      if (!key) return;

      const existing = map.get(key);
      if (existing) {
        existing.options.push(rawOption);
        return;
      }

      map.set(key, { name: rawName, options: [rawOption] });
    });
  });

  return Array.from(map.values()).map((attr, index) => ({
    id: index + 1,
    name: attr.name,
    position: index,
    visible: true,
    variation: true,
    options: dedupeOptions(attr.options),
  }));
};

const inferVariationAttributesFromProduct = (
  productAttributes: ProductAttribute[],
  variations: ProductVariation[]
): ProductVariation[] => {
  const variationAttrs = productAttributes.filter((attr) => attr.variation);
  if (variationAttrs.length !== 1) return variations;

  const sourceAttr = variationAttrs[0];
  if (!sourceAttr.options?.length) return variations;

  return variations.map((variation, index) => {
    if (variation.attributes.length > 0) return variation;
    const option = sourceAttr.options[index];
    if (!option) return variation;

    return {
      ...variation,
      attributes: [
        {
          id: 0,
          name: sourceAttr.name,
          option,
        },
      ],
    };
  });
};

const strTrim = (v: unknown): string => {
  if (v == null) return '';
  const s = String(v).trim();
  return s;
};

const minPriceFromVariations = (variations: ProductVariation[] | undefined): string => {
  if (!variations?.length) return '';
  const nums: number[] = [];
  for (const v of variations) {
    const raw = v.sale_price || v.price || v.regular_price;
    const n = parseFloat(String(raw ?? ''));
    if (Number.isFinite(n) && n > 0) nums.push(n);
  }
  if (!nums.length) return '';
  return String(Math.min(...nums));
};

// ---------------------------------------------------------------------------
// Row → WC Product mapper
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWcProduct(row: any): Product {
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

  const productAttributes: ProductAttribute[] = Array.isArray(row.attributes)
    ? row.attributes
        .filter((a: any) => a.name != null && String(a.name).trim() !== '')
        .map((a: any) => ({
          ...a,
          name: String(a.name).trim(),
          options: Array.isArray(a.options)
            ? a.options.map((o: any) => String(o ?? '').trim()).filter(Boolean)
            : [],
          variation: a.variation ?? a.is_variation ?? false,
        }))
    : [];

  // catalog-product returns variations as full objects; extract before the
  // WC numeric-id mapping destroys them
  const rawInlineVariations =
    Array.isArray(row.variations) && row.variations.length > 0 && typeof row.variations[0] === 'object'
      ? (row.variations as unknown[]).map(toWcVariation)
      : undefined;
  const inlineVariations = rawInlineVariations
    ? inferVariationAttributesFromProduct(productAttributes, rawInlineVariations)
    : undefined;
  const variationIds = rawInlineVariations
    ? rawInlineVariations.map((variation) => variation.id).filter((id) => Number.isFinite(id))
    : Array.isArray(row.variations)
    ? row.variations
        .map((variation: any) => Number(variation))
        .filter((id: number) => Number.isFinite(id))
    : [];

  // Price: parent row is often empty for variable CJ products; vendor list uses
  // regular_price ?? min_price — mirror that (min from row, else inline vars).
  const snapshotNgn = row.sourcing_meta?.final_price_snapshot_ngn
    ?? row.sourcing_meta?.landed_cost_snapshot_ngn
    ?? null;
  const minFromRow = strTrim(row.min_price);
  const minFromVars = minPriceFromVariations(inlineVariations);
  const minPriceMeta = minFromRow || minFromVars;
  const maxPriceMeta = strTrim(row.max_price);
  const baseRegular = strTrim(row.regular_price) || minPriceMeta || (snapshotNgn != null && snapshotNgn !== '' ? String(snapshotNgn) : '');
  const salePrice = strTrim(row.sale_price);
  const price = salePrice || baseRegular;
  const regularPrice = baseRegular;
  const onSale = Boolean(salePrice && baseRegular && salePrice !== baseRegular);

  return {
    supabaseId: row.id ?? undefined,
    _variations: inlineVariations,
    // Prefer WC product ID; fall back to a stable hash of the Supabase UUID so
    // products not yet synced to WooCommerce still get a positive numeric id and
    // pass the p.id > 0 guard used in related-products filtering.
    id: Number(row.woo_product_id ?? row.wc_id ?? 0) || stableNumericId(String(row.id ?? '')),
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
    // Supabase uses is_variation; WC/UI checks attr.variation
    attributes: productAttributes.length
      ? productAttributes
      : inlineVariations?.length
      ? inferAttributesFromVariations(inlineVariations)
      : [],
    default_attributes: Array.isArray(row.default_attributes) ? row.default_attributes : [],
    variations: variationIds,
    grouped_products: Array.isArray(row.grouped_products) ? row.grouped_products : [],
    menu_order: Number(row.menu_order ?? 0),
    min_price: minPriceMeta || undefined,
    max_price: maxPriceMeta || undefined,
    meta_data: Array.isArray(row.meta_data) ? row.meta_data : [],
    store: resolveProductStoreFromCatalogRow(row),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWcVariation(row: any): ProductVariation {
  const regularPrice = String(row.regular_price ?? '');
  const salePrice = row.sale_price ? String(row.sale_price) : '';
  const numericId = Number(row.woo_variation_id ?? row.wc_id ?? 0);
  const fallbackId = stableNumericId(String(row.id ?? row.supabase_id ?? row.supabaseId ?? row.variation_id ?? ''));
  return {
    supabaseId: row.id ?? undefined,
    // Prefer WC variation IDs, but synthesize a stable numeric fallback for
    // Supabase-only rows so UI keys and cart entries stay stable.
    id: numericId || fallbackId,
    sku: row.sku ?? '',
    price: salePrice || regularPrice,
    regular_price: regularPrice,
    sale_price: salePrice,
    on_sale: Boolean(salePrice && salePrice !== regularPrice),
    stock_status: row.stock_status ?? 'instock',
    stock_quantity: row.stock_quantity != null ? Number(row.stock_quantity) : null,
    manage_stock: Boolean(row.manage_stock),
    // Supabase stores attrs in two formats depending on import path:
    //  - CJ import:  [{name, value}]  (array)
    //  - WC migrate: {colour: "...", size: "..."}  (flat object with slugified keys)
    attributes: Array.isArray(row.attributes)
      ? row.attributes
          .filter((a: any) => a.name != null && String(a.name).trim() !== '')
          .map((a: any) => ({
            id: 0,
            name: String(a.name).trim(),
            option: String(a.option ?? a.value ?? '').trim(),
          }))
      : row.attributes && typeof row.attributes === 'object'
      ? Object.entries(row.attributes as Record<string, unknown>)
          .filter(([k, v]) => k && v != null && String(v).trim() !== '')
          .map(([k, v]) => ({
            id: 0,
            name: k.trim(),
            option: String(v).trim(),
          }))
      : [],
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
  if (params.offset != null) qs.set('offset', String(params.offset));
  if (params.include?.length) qs.set('include', params.include.join(','));
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
  if (!resp?.success || !Array.isArray(resp.data)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = resp.meta as any;
  if (resp.data.length === 0) {
    return {
      products: [],
      total: Number(meta?.total ?? 0),
      totalPages: Number(meta?.total_pages ?? 0),
    };
  }
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
