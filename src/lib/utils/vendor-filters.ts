/**
 * Vendor Filtering Utilities
 * Works on both server-side (Server Components) and client-side (Client Components)
 */

import { Product } from '@/types/product';

type VendorStatus = {
  id: number;
  store_name: string;
  enabled: boolean;
  is_store_vacation: boolean;
  is_active: boolean;
};

const VENDOR_STATUS_TIMEOUT_MS = 8000;
/** Matches the 300s revalidate convention used elsewhere for JLO/catalog fetches. */
const VENDOR_STATUS_TTL_MS = 5 * 60 * 1000;

type VendorCacheEntry = { promise: Promise<VendorStatus[]>; expiresAt: number };

let serverVendorsCache: VendorCacheEntry | null = null;
let clientVendorsCache: VendorCacheEntry | null = null;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Vendors are keyed by legacy numeric WooCommerce vendor id; JLO-onboarded vendors use
 * `woocommerce_vendor_id = "jlo-{uuid}"` and are treated as always-active (see caller).
 * Mirrors the numeric-only matching in parseCatalogVendorRouteKey (product-store.ts).
 */
function toLegacyVendorId(value: unknown): number | null {
  const trimmed = String(value ?? '').trim();
  if (!trimmed || !/^[0-9]+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Get all vendors status - SERVER SIDE VERSION
 * Supabase is the source of truth (WooCommerce vendor plugin was retired).
 */
async function getAllVendorsStatusServer(): Promise<VendorStatus[]> {
  if (!serverVendorsCache || serverVendorsCache.expiresAt <= Date.now()) {
    const promise = (async () => {
      try {
        const { getSupabaseServerClient } = await import('@/lib/supabase-server');
        const supabase = getSupabaseServerClient();

        const { data, error } = await supabase
          .from('vendors')
          .select('woocommerce_vendor_id, store_name, is_active')
          .not('woocommerce_vendor_id', 'is', null)
          .limit(500);

        if (error) {
          console.error('[SERVER] Error fetching vendors:', error.message);
          serverVendorsCache = null;
          return [];
        }

        const vendors: VendorStatus[] = (data ?? [])
          .map((row) => {
            const id = toLegacyVendorId(row.woocommerce_vendor_id);
            if (id == null) return null;
            const isActive = Boolean(row.is_active);
            return {
              id,
              store_name: row.store_name ?? '',
              enabled: isActive,
              is_store_vacation: false,
              is_active: isActive,
            };
          })
          .filter((v): v is VendorStatus => v != null);

        console.log(`[SERVER] Fetched ${vendors.length} vendors`);
        return vendors;
      } catch (error: unknown) {
        serverVendorsCache = null;
        console.error('[SERVER] Error fetching vendors:', getErrorMessage(error));
        return [];
      }
    })();

    serverVendorsCache = { promise, expiresAt: Date.now() + VENDOR_STATUS_TTL_MS };
  }

  return serverVendorsCache.promise;
}

/**
 * Get all vendors status - CLIENT SIDE VERSION
 * Calls Next.js API route
 */
async function getAllVendorsStatusClient(): Promise<VendorStatus[]> {
  if (!clientVendorsCache || clientVendorsCache.expiresAt <= Date.now()) {
    const promise = (async () => {
      try {
        const url = '/api/vendors/status';
        console.log(`[CLIENT] Fetching vendors from: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), VENDOR_STATUS_TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          if (!response.ok) {
            console.error(`[CLIENT] Vendor API error: ${response.status}`);
            clientVendorsCache = null;
            return [];
          }

          const data = (await response.json()) as VendorStatus[];
          console.log(`[CLIENT] Fetched ${data.length} vendors`);
          return data;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error: unknown) {
        clientVendorsCache = null;
        console.error('[CLIENT] Error fetching vendors:', getErrorMessage(error));
        return [];
      }
    })();

    clientVendorsCache = { promise, expiresAt: Date.now() + VENDOR_STATUS_TTL_MS };
  }

  return clientVendorsCache.promise;
}

/**
 * Detect if running on server or client
 */
function isServer() {
  return typeof window === 'undefined';
}

/**
 * Get all vendors - works on both server and client
 */
async function getAllVendors() {
  if (isServer()) {
    return getAllVendorsStatusServer();
  }

  return getAllVendorsStatusClient();
}

/**
 * Filter products to only show those from active vendors
 * Works on both server-side (SSR) and client-side
 */
export async function filterActiveVendorProducts(products: Product[]): Promise<Product[]> {
  if (!products || products.length === 0) {
    return [];
  }

  console.log(`Filtering ${products.length} products...`);

  try {
    const vendors = await getAllVendors();

    if (vendors.length === 0) {
      console.warn('No vendors fetched - showing all products (fail-safe)');
      return products;
    }

    const activeVendorIds = new Set(
      vendors.filter((vendor) => vendor.is_active === true).map((vendor) => vendor.id)
    );

    console.log(`Active vendors: ${activeVendorIds.size} out of ${vendors.length}`);

    const filtered = products.filter((product) => {
      const vendorId = product.store?.id;

      if (!vendorId) {
        console.warn(`Product ${product.id} has no vendor - keeping it`);
        return true;
      }

      // JLO onboarding uses non-numeric vendor keys (e.g. `jlo-{uuid}`) not present in Woo vendors-status.
      if (typeof vendorId === 'string') {
        return true;
      }

      const isActive = activeVendorIds.has(vendorId);

      if (!isActive) {
        console.log(`Hiding product "${product.name}" - vendor ${vendorId} is inactive`);
      }

      return isActive;
    });

    console.log(
      `Filter complete: ${filtered.length} products (removed ${products.length - filtered.length})`
    );

    return filtered;
  } catch (error: unknown) {
    console.error('Error filtering products:', getErrorMessage(error));
    return products;
  }
}
