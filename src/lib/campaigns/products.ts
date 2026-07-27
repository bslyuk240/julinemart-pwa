import { getSupabaseServerClient } from '@/lib/supabase-server';
import { toWcProduct } from '@/lib/catalog/client';
import type { Campaign, CampaignProductSelectionRules } from '@/types/campaigns';
import type { Product } from '@/types/product';

// BE-202 — 5-minute in-memory result cache, same "ephemeral, single-instance
// only" pattern already used for the rate-limiter fallback in middleware.ts.
// Fine for this: worst case is a cold serverless instance re-fetching once.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; products: Product[] }>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ProductImageRow {
  src: string | null;
  alt: string | null;
  position: number | null;
  is_thumbnail: boolean | null;
}

interface ProductCategoryMapRow {
  categories: { id: number | null; name: string | null; slug: string | null } | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProductRow = Record<string, any> & {
  images?: ProductImageRow[];
  category_map?: ProductCategoryMapRow[];
};

function sortImages(images: ProductImageRow[] = []): ProductImageRow[] {
  return [...images].sort((a, b) => {
    if (Boolean(a.is_thumbnail) !== Boolean(b.is_thumbnail)) return a.is_thumbnail ? -1 : 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });
}

// Reuses the JLO catalog function's own row → Product mapper (toWcProduct),
// just building the "embedded categories/images" shape it expects ourselves
// instead of relying on the external JLO Netlify function to have done it.
function rowToProduct(row: ProductRow): Product {
  const images = sortImages(row.images).map((img) => ({ src: img.src ?? '', alt: img.alt ?? '' }));
  const categories = (row.category_map ?? [])
    .map((m) => m.categories)
    .filter((c): c is NonNullable<typeof c> => Boolean(c?.name && c?.slug))
    .map((c) => ({ id: c!.id ?? 0, name: c!.name as string, slug: c!.slug as string }));
  return toWcProduct({ ...row, images, categories });
}

// campaign_selection_rules.categoryIds store Supabase `categories.id` (uuid).
async function productIdsForCategory(categoryId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('product_category_map')
    .select('product_id')
    .eq('category_id', categoryId);
  return (data ?? []).map((r: { product_id: string }) => r.product_id);
}

// campaign_selection_rules.vendorId is entered by admins as either the
// Supabase vendors.id (uuid) or the legacy WooCommerce vendor id (varchar) —
// try both so either input shape resolves to the real vendor row.
async function resolveVendorUuid(vendorId: string | number): Promise<string | null> {
  const raw = String(vendorId);
  const supabase = getSupabaseServerClient();
  if (UUID_RE.test(raw)) {
    const { data } = await supabase.from('vendors').select('id').eq('id', raw).maybeSingle<{ id: string }>();
    if (data?.id) return data.id;
  }
  const { data } = await supabase
    .from('vendors')
    .select('id')
    .eq('woocommerce_vendor_id', raw)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

// Queries Supabase directly instead of the JLO catalog Netlify function.
// The JLO function was confirmed (live, against the deployed endpoint) to
// silently ignore its own `include`/filter query params — e.g. `?include=1791`
// returned the same list as no filter at all. Rather than depend on that
// upstream contract, campaign product selection reads the same `products`
// table the JLO function itself serves from, applying the filters ourselves.
async function fetchProductsFromSupabase(rules: CampaignProductSelectionRules): Promise<Product[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from('products')
    .select(
      '*, images:product_images(src, alt, position, is_thumbnail), category_map:product_category_map(categories(id, woo_term_id, name, slug)), vendor:vendors!products_vendor_id_fkey(id, store_name, woocommerce_vendor_id)'
    )
    .eq('status', 'published');

  if (rules.source === 'manual') {
    const numericIds = (rules.manualProductIds ?? []).map(Number).filter((n) => !Number.isNaN(n));
    if (!numericIds.length) return [];
    query = query.in('woo_product_id', numericIds);
  } else if (rules.categoryIds?.length) {
    const productIds = await productIdsForCategory(String(rules.categoryIds[0]));
    if (!productIds.length) return [];
    query = query.in('id', productIds);
  }

  // Vendor scope applies to automatic, rules-based, and manual — never mix sellers
  // on a vendor-targeted campaign.
  if (rules.vendorId != null) {
    const vendorUuid = await resolveVendorUuid(rules.vendorId);
    if (!vendorUuid) return [];
    query = query.eq('vendor_id', vendorUuid);
  }

  if (rules.source !== 'manual') {
    if (rules.inStockOnly) {
      query = query.eq('stock_status', 'instock');
    }
    if (rules.discountedOnly) {
      query = query.not('sale_price', 'is', null);
    }
    query = query.limit(100);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  let rows = data as ProductRow[];
  if (rules.source !== 'manual' && rules.discountedOnly) {
    rows = rows.filter((r) => Number(r.sale_price ?? 0) > 0 && Number(r.sale_price) < Number(r.regular_price ?? 0));
  }

  let products = rows.map(rowToProduct);

  if (rules.source === 'manual') {
    const wantedIds = (rules.manualProductIds ?? []).map(String);
    const wanted = new Set(wantedIds);
    products = products.filter((p) => wanted.has(String(p.id)));
    products.sort((a, b) => wantedIds.indexOf(String(a.id)) - wantedIds.indexOf(String(b.id)));
  }

  return products;
}

export interface ResolvedCampaignProducts {
  products: Product[];
  total: number;
  source: CampaignProductSelectionRules['source'];
}

/** Fill missing vendor/category scope from the campaign target itself. */
export function resolveEffectiveProductRules(campaign: Campaign): CampaignProductSelectionRules {
  const rules: CampaignProductSelectionRules = { ...campaign.productSelectionRules };

  if (rules.vendorId == null) {
    const fromOverride = campaign.vendorOverride?.vendorId;
    if (fromOverride != null) {
      rules.vendorId = fromOverride;
    } else if (campaign.targetType === 'vendor' && campaign.targetId) {
      rules.vendorId = campaign.targetId;
    }
  }

  if (!rules.categoryIds?.length && campaign.targetType === 'category' && campaign.targetId) {
    rules.categoryIds = [campaign.targetId];
  }

  // Vendor / category targets should never resolve as an unscoped "automatic" dump.
  if (
    rules.source === 'automatic' &&
    (rules.vendorId != null || (rules.categoryIds && rules.categoryIds.length > 0))
  ) {
    rules.source = 'rules_based';
  }

  return rules;
}

export async function resolveCampaignProducts(campaign: Campaign): Promise<ResolvedCampaignProducts> {
  const rules = resolveEffectiveProductRules(campaign);
  const cacheKey = `${campaign.id}:${JSON.stringify(rules)}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { products: cached.products, total: cached.products.length, source: rules.source };
  }

  let products = await fetchProductsFromSupabase(rules);

  if (rules.excludeSkus?.length) {
    const excluded = new Set(rules.excludeSkus);
    products = products.filter((p) => !excluded.has(p.sku));
  }

  if (rules.minimumRating != null) {
    const minRating = rules.minimumRating;
    products = products.filter((p) => parseFloat(p.average_rating || '0') >= minRating);
  }

  if (rules.pinnedProductIds?.length) {
    const pinned = new Set(rules.pinnedProductIds.map(String));
    products = [
      ...products.filter((p) => pinned.has(String(p.id))),
      ...products.filter((p) => !pinned.has(String(p.id))),
    ];
  }

  if (rules.maxProducts) {
    products = products.slice(0, rules.maxProducts);
  }

  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, products });
  return { products, total: products.length, source: rules.source };
}
