import type { Product } from '@/types/product';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Meta keys commonly used by WCFM / Woo for the marketplace vendor (numeric WC user id). */
const VENDOR_META_KEYS = new Set([
  '_wcfm_vendor_id',
  '_wcfmmp_vendor_id',
  '_vendor_id',
  'woo_vendor_id',
  'woocommerce_vendor_id',
  'wcfm_vendor_id',
]);

function parseWooVendorId(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER);
  }
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t || UUID_RE.test(t)) return 0;
    const n = Number(t);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER) : 0;
  }
  return 0;
}

function vendorIdFromMeta(meta: unknown): number {
  if (!Array.isArray(meta)) return 0;
  for (const m of meta as { key?: string; value?: unknown }[]) {
    if (!m?.key || !VENDOR_META_KEYS.has(m.key)) continue;
    const id = parseWooVendorId(m.value);
    if (id) return id;
  }
  return 0;
}

/**
 * Build `Product.store` from a JLO / Supabase catalog row.
 * Supports multiple vendor id field names (migration + CJ import paths) and WC-style meta_data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveProductStoreFromCatalogRow(row: any): Product['store'] {
  const rawStore = row?.store;
  if (rawStore && typeof rawStore === 'object') {
    const sid = parseWooVendorId(rawStore.id);
    if (sid > 0) {
      return {
        id: sid,
        name: String(rawStore.name ?? ''),
        shop_name: String(rawStore.shop_name ?? rawStore.name ?? ''),
        url:
          typeof rawStore.url === 'string' && rawStore.url
            ? rawStore.url
            : `/vendor/${sid}`,
        address: rawStore.address ?? {},
      };
    }
  }

  const vendor = row?.vendor;
  let vid =
    parseWooVendorId(vendor?.woocommerce_vendor_id) ||
    parseWooVendorId(vendor?.woo_vendor_id) ||
    parseWooVendorId(vendor?.wcfm_vendor_id) ||
    parseWooVendorId(vendor?.wc_vendor_id) ||
    parseWooVendorId(row?.woocommerce_vendor_id) ||
    parseWooVendorId(row?.wc_vendor_id) ||
    parseWooVendorId(row?.woo_vendor_id) ||
    parseWooVendorId(row?.wcfm_vendor_id);

  // Some rows use vendor.id as the WC vendor user id (numeric); never treat UUID as id.
  if (!vid && vendor?.id != null && !UUID_RE.test(String(vendor.id).trim())) {
    vid = parseWooVendorId(vendor.id);
  }

  if (!vid) vid = vendorIdFromMeta(row?.meta_data);

  if (!vid) return undefined;

  return {
    id: vid,
    name: vendor?.store_name ?? `Vendor ${vid}`,
    shop_name: vendor?.store_name ?? `Vendor ${vid}`,
    url: `/vendor/${vid}`,
    address: {},
  };
}
