/**
 * Supabase catalog client — server-side only.
 *
 * Queries the new products/variations/categories/tags tables
 * and maps results to the existing WooCommerce Product type for
 * full backward compatibility with cart, checkout, and order code.
 *
 * Used as primary source with WooCommerce as fallback:
 *   catalogGetProducts → WC getProducts
 *   catalogGetProduct  → WC getProduct
 */

import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { Product, ProductVariation, ProductsQueryParams } from '@/types/product';

// ─── type helpers ─────────────────────────────────────────────────────────────

type SupabaseProduct = Record<string, any>;

/**
 * Map a Supabase product row (with nested joins) to the WooCommerce Product shape.
 * woo_product_id becomes id — all cart/checkout logic works unchanged.
 */
function toWcProduct(p: SupabaseProduct): Product {
  const price = p.sale_price ?? p.regular_price ?? '0';

  // Reconstruct meta_data so cart-store.ts hub/vendor lookups keep working
  const meta_data: Array<{ key: string; value: string }> = [];
  if (p.hub_id) {
    meta_data.push({ key: '_julinemart_hub_id', value: p.hub_id });
    meta_data.push({ key: 'hub_id', value: p.hub_id });
  }
  if (p.hubs?.name) {
    meta_data.push({ key: '_julinemart_hub_name', value: p.hubs.name });
    meta_data.push({ key: 'hub_name', value: p.hubs.name });
  }
  if (p.vendors?.woocommerce_vendor_id) {
    const wid = String(p.vendors.woocommerce_vendor_id);
    meta_data.push({ key: '_wcfm_vendor_id', value: wid });
    meta_data.push({ key: '_vendor_id', value: wid });
    meta_data.push({ key: 'vendor_id', value: wid });
  }
  if (p.vendors?.store_name) {
    meta_data.push({ key: '_vendor_name', value: p.vendors.store_name });
    meta_data.push({ key: 'vendor_name', value: p.vendors.store_name });
    meta_data.push({ key: '_wcfm_vendor_name', value: p.vendors.store_name });
  }
  if (p.sourcing_meta) {
    for (const [k, v] of Object.entries(p.sourcing_meta)) {
      if (v != null) meta_data.push({ key: `_${k}`, value: String(v) });
    }
  }

  const images = (p.product_images || [])
    .filter((img: any) => !img.variation_id)
    .sort((a: any, b: any) => a.position - b.position)
    .map((img: any) => ({ id: 0, src: img.src, alt: img.alt || '', name: '', date_created: '', date_modified: '' }));

  const categories = (p.product_category_map || [])
    .map((r: any) => r.categories)
    .filter(Boolean)
    .map((c: any) => ({ id: c.woo_term_id || 0, name: c.name, slug: c.slug }));

  const tags = (p.product_tag_map || [])
    .map((r: any) => r.tags)
    .filter(Boolean)
    .map((t: any) => ({ id: t.woo_term_id || 0, name: t.name, slug: t.slug }));

  const attributes = (p.product_attribute_map || [])
    .sort((a: any, b: any) => a.display_order - b.display_order)
    .map((a: any) => ({
      id: 0,
      name: a.product_attributes?.name || '',
      slug: a.product_attributes?.slug || '',
      position: a.display_order || 0,
      visible: true,
      variation: a.is_variation,
      options: a.options || [],
    }));

  const variationIds = (p.product_variations || [])
    .filter((v: any) => v.is_active)
    .map((v: any) => v.woo_variation_id)
    .filter(Boolean);

  return {
    id: p.woo_product_id || 0,
    name: p.name || '',
    slug: p.slug || '',
    permalink: '',
    date_created: p.created_at || '',
    date_modified: p.updated_at || '',
    type: p.type as Product['type'],
    status: 'publish',
    featured: false,
    catalog_visibility: 'visible',
    description: p.description || '',
    short_description: p.short_description || '',
    sku: p.sku || '',
    price: String(price),
    regular_price: String(p.regular_price ?? ''),
    sale_price: String(p.sale_price ?? ''),
    date_on_sale_from: null,
    date_on_sale_to: null,
    price_html: '',
    on_sale: !!p.sale_price,
    purchasable: true,
    total_sales: 0,
    virtual: !!p.is_virtual,
    downloadable: !!p.is_downloadable,
    external_url: '',
    button_text: '',
    tax_status: 'taxable',
    tax_class: '',
    manage_stock: !!p.manage_stock,
    stock_quantity: p.stock_quantity ?? null,
    stock_status: (p.stock_status as Product['stock_status']) || 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    sold_individually: !!p.sold_individually,
    weight: p.weight ? String(p.weight) : null,
    dimensions: {
      length: p.length ? String(p.length) : '',
      width: p.width ? String(p.width) : '',
      height: p.height ? String(p.height) : '',
    },
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
    attributes,
    default_attributes: [],
    variations: variationIds,
    grouped_products: [],
    menu_order: 0,
    meta_data,
    store: p.vendors
      ? {
          id: p.vendors.woocommerce_vendor_id || 0,
          name: p.vendors.store_name || '',
          shop_name: p.vendors.store_name || '',
          url: p.vendors.store_slug ? `/store/${p.vendors.store_slug}` : '',
          address: {},
        }
      : undefined,
  } as unknown as Product;
}

function toWcVariation(v: SupabaseProduct, product: SupabaseProduct): ProductVariation {
  const price = v.sale_price ?? v.regular_price ?? '0';
  const varImages = (v.product_images || []).map((img: any) => ({
    id: 0, src: img.src, alt: img.alt || '', name: '', date_created: '', date_modified: '',
  }));

  const attributes = Object.entries(v.attributes || {}).map(([slug, val]) => ({
    id: 0,
    name: slug,
    option: String(val),
  }));

  const meta_data: Array<{ key: string; value: string }> = [];
  if (v.sourcing_meta) {
    for (const [k, val] of Object.entries(v.sourcing_meta)) {
      if (val != null) meta_data.push({ key: `_${k}`, value: String(val) });
    }
  }
  if (v.hub_id) meta_data.push({ key: '_julinemart_hub_id', value: v.hub_id });
  if (product.vendors?.woocommerce_vendor_id) {
    meta_data.push({ key: '_wcfm_vendor_id', value: String(product.vendors.woocommerce_vendor_id) });
  }

  return {
    id: v.woo_variation_id || 0,
    date_created: v.created_at || '',
    date_modified: v.updated_at || '',
    description: '',
    permalink: '',
    sku: v.sku || '',
    price: String(price),
    regular_price: String(v.regular_price ?? ''),
    sale_price: String(v.sale_price ?? ''),
    date_on_sale_from: null,
    date_on_sale_to: null,
    on_sale: !!v.sale_price,
    status: 'publish',
    purchasable: true,
    virtual: false,
    downloadable: false,
    manage_stock: !!v.manage_stock,
    stock_quantity: v.stock_quantity ?? null,
    stock_status: v.stock_status || 'instock',
    backorders: 'no',
    backorders_allowed: false,
    backordered: false,
    weight: '',
    dimensions: { length: '', width: '', height: '' },
    shipping_class: '',
    shipping_class_id: 0,
    image: varImages[0] || null,
    attributes,
    menu_order: 0,
    meta_data,
  } as unknown as ProductVariation;
}

// ─── product select fragment ──────────────────────────────────────────────────

const PRODUCT_SELECT = `
  id, woo_product_id, name, slug, short_description, status, type,
  regular_price, sale_price, sku, weight, length, width, height,
  manage_stock, stock_quantity, stock_status,
  is_virtual, is_downloadable, ships_from_abroad, sold_individually,
  sourcing_meta, seo_title, seo_description, created_at, updated_at,
  vendors!vendor_id ( id, store_name, store_slug, woocommerce_vendor_id ),
  hubs!hub_id ( id, name, code ),
  product_images ( id, src, alt, position, is_thumbnail, variation_id ),
  product_category_map ( categories ( id, woo_term_id, name, slug ) ),
  product_tag_map ( tags ( id, woo_term_id, name, slug ) ),
  product_attribute_map (
    id, options, is_variation, display_order,
    product_attributes ( id, name, slug, type )
  )
`.trim();

const PRODUCT_DETAIL_SELECT = `
  ${PRODUCT_SELECT},
  product_variations (
    id, woo_variation_id, sku, regular_price, sale_price,
    stock_quantity, stock_status, manage_stock, attributes, is_active,
    sourcing_meta, hub_id, vendor_id, created_at, updated_at,
    product_images ( id, src, alt, position )
  )
`.trim();

// ─── public API ───────────────────────────────────────────────────────────────

export interface CatalogProductsParams {
  page?: number;
  per_page?: number;
  category?: string;   // slug
  tag?: string;        // slug
  search?: string;
  vendor_id?: string;  // Supabase UUID
  type?: 'simple' | 'variable';
}

export interface CatalogProductsResult {
  products: Product[];
  total: number;
  totalPages: number;
}

/**
 * List products from Supabase catalog.
 * Returns null if Supabase is not configured or returns no data
 * (signal to caller to fall back to WooCommerce).
 */
export async function catalogGetProducts(
  params: CatalogProductsParams = {}
): Promise<CatalogProductsResult | null> {
  let supabase: ReturnType<typeof getSupabaseServerClient>;
  try {
    supabase = getSupabaseServerClient();
  } catch {
    return null; // Supabase not configured
  }

  const page = Math.max(params.page || 1, 1);
  const perPage = Math.min(params.per_page || 20, 100);
  const offset = (page - 1) * perPage;

  try {
    let productIds: string[] | null = null;

    // Category filter
    if (params.category) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', params.category)
        .maybeSingle();
      if (!cat) return { products: [], total: 0, totalPages: 0 };
      const { data: map } = await supabase
        .from('product_category_map')
        .select('product_id')
        .eq('category_id', cat.id);
      productIds = (map || []).map((r: any) => r.product_id);
      if (productIds.length === 0) return { products: [], total: 0, totalPages: 0 };
    }

    // Tag filter
    if (params.tag) {
      const { data: tag } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', params.tag)
        .maybeSingle();
      if (!tag) return { products: [], total: 0, totalPages: 0 };
      const { data: map } = await supabase
        .from('product_tag_map')
        .select('product_id')
        .eq('tag_id', tag.id);
      const tagIds = (map || []).map((r: any) => r.product_id);
      if (tagIds.length === 0) return { products: [], total: 0, totalPages: 0 };
      // Intersect with category filter if both provided
      productIds = productIds
        ? productIds.filter((id) => tagIds.includes(id))
        : tagIds;
      if (productIds.length === 0) return { products: [], total: 0, totalPages: 0 };
    }

    let query = supabase
      .from('products')
      .select(PRODUCT_SELECT, { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (productIds) query = query.in('id', productIds);
    if (params.search) query = query.ilike('name', `%${params.search}%`);
    if (params.vendor_id) query = query.eq('vendor_id', params.vendor_id);
    if (params.type) query = query.eq('type', params.type);

    const { data, error, count } = await query;
    if (error || !data || data.length === 0) return null;

    return {
      products: data.map(toWcProduct),
      total: count || 0,
      totalPages: count ? Math.ceil(count / perPage) : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Get a single product by WooCommerce ID or slug.
 * Returns null on miss — caller falls back to WooCommerce.
 */
export async function catalogGetProduct(
  idOrSlug: number | string
): Promise<Product | null> {
  let supabase: ReturnType<typeof getSupabaseServerClient>;
  try {
    supabase = getSupabaseServerClient();
  } catch {
    return null;
  }

  try {
    let query = supabase
      .from('products')
      .select(PRODUCT_DETAIL_SELECT)
      .eq('status', 'published');

    if (typeof idOrSlug === 'number') {
      query = query.eq('woo_product_id', idOrSlug);
    } else {
      query = query.eq('slug', idOrSlug);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    return toWcProduct(data);
  } catch {
    return null;
  }
}

/**
 * Get variations for a variable product from Supabase.
 * Returns null on miss — caller falls back to WooCommerce.
 */
export async function catalogGetVariations(
  wooProductId: number
): Promise<ProductVariation[] | null> {
  let supabase: ReturnType<typeof getSupabaseServerClient>;
  try {
    supabase = getSupabaseServerClient();
  } catch {
    return null;
  }

  try {
    // Get product first to pass vendor info to mapper
    const { data: product } = await supabase
      .from('products')
      .select('id, vendors!vendor_id(woocommerce_vendor_id, store_name)')
      .eq('woo_product_id', wooProductId)
      .maybeSingle();

    if (!product) return null;

    const { data, error } = await supabase
      .from('product_variations')
      .select(`
        id, woo_variation_id, sku, regular_price, sale_price,
        stock_quantity, stock_status, manage_stock, attributes, is_active,
        sourcing_meta, hub_id, vendor_id, created_at, updated_at,
        product_images ( id, src, alt, position )
      `)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .order('woo_variation_id', { ascending: true });

    if (error || !data || data.length === 0) return null;

    return data.map((v: any) => toWcVariation(v, product));
  } catch {
    return null;
  }
}
