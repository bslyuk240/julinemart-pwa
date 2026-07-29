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

/** Canonical vendor key for `/vendor/[id]` + JLO `woo_vendor_id` catalog filter. */
export type CatalogVendorRouteKey = number | string;

/**
 * JLO stores non–WooCommerce marketplace vendors as `woocommerce_vendor_id = "jlo-{application_uuid}"`
 * (see vendor-approve.js). Those must stay strings; Number("jlo-…") is NaN and would hide vendor links.
 */
export function parseCatalogVendorRouteKey(v: unknown): CatalogVendorRouteKey | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
    return Math.min(Math.floor(v), Number.MAX_SAFE_INTEGER);
  }
  if (typeof v === 'string') {
    const t = v.trim();
    if (!t || UUID_RE.test(t)) return null;
    if (/^[0-9]+$/.test(t)) {
      const n = Number(t);
      return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), Number.MAX_SAFE_INTEGER) : null;
    }
    return t;
  }
  return null;
}

function vendorKeyFromMeta(meta: unknown): CatalogVendorRouteKey | null {
  if (!Array.isArray(meta)) return null;
  for (const m of meta as { key?: string; value?: unknown }[]) {
    if (!m?.key || !VENDOR_META_KEYS.has(m.key)) continue;
    const k = parseCatalogVendorRouteKey(m.value);
    if (k != null) return k;
  }
  return null;
}

function pickVendorRouteKeyFromRow(row: {
  vendor?: Record<string, unknown> | null;
  woocommerce_vendor_id?: unknown;
  wc_vendor_id?: unknown;
  woo_vendor_id?: unknown;
  wcfm_vendor_id?: unknown;
  meta_data?: unknown;
}): CatalogVendorRouteKey | null {
  const vendor = row?.vendor;
  const candidates = [
    vendor?.woocommerce_vendor_id,
    vendor?.woo_vendor_id,
    vendor?.wcfm_vendor_id,
    vendor?.wc_vendor_id,
    row?.woocommerce_vendor_id,
    row?.wc_vendor_id,
    row?.woo_vendor_id,
    row?.wcfm_vendor_id,
  ];

  for (const c of candidates) {
    const k = parseCatalogVendorRouteKey(c);
    if (k != null) return k;
  }

  if (vendor?.id != null && !UUID_RE.test(String(vendor.id).trim())) {
    const k = parseCatalogVendorRouteKey(vendor.id);
    if (k != null) return k;
  }

  return vendorKeyFromMeta(row?.meta_data);
}

/**
 * Build `Product.store` from a JLO / Supabase catalog row.
 * Supports numeric WC vendor ids and JLO synthetic ids (`jlo-…`), plus WC-style meta_data.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function resolveProductStoreFromCatalogRow(row: any): Product['store'] {
  const rawStore = row?.store;
  if (rawStore && typeof rawStore === 'object' && rawStore.id != null) {
    const key = parseCatalogVendorRouteKey(rawStore.id);
    if (key != null) {
      return {
        id: key,
        name: String(rawStore.name ?? ''),
        shop_name: String(rawStore.shop_name ?? rawStore.name ?? ''),
        url:
          typeof rawStore.url === 'string' && rawStore.url
            ? rawStore.url
            : `/vendor/${key}`,
        address: rawStore.address ?? {},
      };
    }
  }

  const vendor = row?.vendor;
  const key = pickVendorRouteKeyFromRow(row);
  if (key == null) return undefined;

  return {
    id: key,
    name: vendor?.store_name ?? `Vendor ${key}`,
    shop_name: vendor?.store_name ?? `Vendor ${key}`,
    url: `/vendor/${key}`,
    address: {},
  };
}
