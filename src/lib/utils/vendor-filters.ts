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

let serverVendorsCache: Promise<VendorStatus[]> | null = null;
let clientVendorsCache: Promise<VendorStatus[]> | null = null;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Get all vendors status - SERVER SIDE VERSION
 * Calls WordPress directly (not through API route)
 */
async function getAllVendorsStatusServer(): Promise<VendorStatus[]> {
  if (!serverVendorsCache) {
    serverVendorsCache = (async () => {
      try {
        const baseUrl =
          process.env.WC_BASE_URL?.replace('/wc/v3', '') ||
          process.env.NEXT_PUBLIC_WC_BASE_URL?.replace('/wc/v3', '') ||
          '';

        if (!baseUrl) {
          console.error('No base URL configured');
          return [];
        }

        const url = `${baseUrl}/julinemart/v1/vendors-status`;
        console.log(`[SERVER] Fetching vendors from: ${url}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), VENDOR_STATUS_TIMEOUT_MS);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            next: { revalidate: 60 },
            signal: controller.signal,
          });

          if (!response.ok) {
            console.error(`[SERVER] Vendor API error: ${response.status}`);
            return [];
          }

          const data = (await response.json()) as VendorStatus[];
          console.log(`[SERVER] Fetched ${data.length} vendors`);
          return data;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error: unknown) {
        serverVendorsCache = null;
        console.error('[SERVER] Error fetching vendors:', getErrorMessage(error));
        return [];
      }
    })();
  }

  return serverVendorsCache;
}

/**
 * Get all vendors status - CLIENT SIDE VERSION
 * Calls Next.js API route
 */
async function getAllVendorsStatusClient(): Promise<VendorStatus[]> {
  if (!clientVendorsCache) {
    clientVendorsCache = (async () => {
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
  }

  return clientVendorsCache;
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
