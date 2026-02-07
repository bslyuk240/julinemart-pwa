/**
 * Updated Vendor Service for PWA - API ROUTE VERSION
 * Uses Next.js API routes to avoid CORS issues
 *
 * Location: src/lib/woocommerce/vendors-custom.ts
 */

import { handleApiError } from './client';
import { Vendor } from '@/types/vendor';
import { getProducts } from './products';
import type { Product } from '@/types/product';

/**
 * Call Next.js API route (no CORS issues)
 */
async function apiCall(endpoint: string) {
  const url = `/api/vendors/${endpoint}`;
  
  console.log(`🔗 Calling API: ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get vendor status using custom endpoint
 * Works even for disabled vendors (unlike WCFM API)
 */
export async function getVendorStatus(vendorId: number): Promise<{
  id: number;
  store_name: string;
  enabled: boolean;
  is_store_vacation: boolean;
  vacation_message?: string;
  is_active: boolean;
} | null> {
  try {
    const data = await apiCall(`status/${vendorId}`);
    return data;
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${vendorId} status`);
    return null;
  }
}

/**
 * Get all vendors with their status (including disabled)
 * Much more efficient than checking each vendor individually
 */
export async function getAllVendorsStatus(): Promise<Array<{
  id: number;
  store_name: string;
  enabled: boolean;
  is_store_vacation: boolean;
  is_active: boolean;
}>> {
  try {
    const data = await apiCall('status');
    return data;
  } catch (error) {
    handleApiError(error, 'Error fetching all vendors status');
    return [];
  }
}

/**
 * Get accurate product count for a vendor
 */
export async function getVendorProductCount(vendorId: number): Promise<{
  vendor_id: number;
  product_count: number;
  product_ids: number[];
} | null> {
  try {
    const data = await apiCall(`product-count/${vendorId}`);
    return data;
  } catch (error) {
    handleApiError(error, `Error fetching product count for vendor ${vendorId}`);
    return null;
  }
}

/**
 * Get full vendor details (for vendor page)
 * Uses existing /julinemart/v1/vendors/{id} endpoint
 */
export async function getVendorById(id: number): Promise<Vendor | null> {
  try {
    const data = await apiCall(`${id}`);
    return data as Vendor;
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${id}`);
    return null;
  }
}

const VENDOR_PRODUCTS_CHUNK = 100;

/**
 * Get all products for a vendor.
 * Uses backend vendor-product-count (returns product_ids) then fetches products by ID
 * so vendor pages show the correct products even when WooCommerce list doesn't include store data.
 * Falls back to fetching pages and filtering by product.store.id if backend has no product_ids.
 */
export async function getVendorProducts(vendorId: number): Promise<Product[]> {
  try {
    const countData = await getVendorProductCount(vendorId);
    if (countData?.product_ids?.length) {
      const ids = countData.product_ids;
      const chunks: number[][] = [];
      for (let i = 0; i < ids.length; i += VENDOR_PRODUCTS_CHUNK) {
        chunks.push(ids.slice(i, i + VENDOR_PRODUCTS_CHUNK));
      }
      const results: Product[] = [];
      for (const chunk of chunks) {
        const products = await getProducts({ include: chunk, per_page: chunk.length });
        results.push(...products);
      }
      const byId = new Map(results.map((p) => [p.id, p]));
      return ids.map((id) => byId.get(id)).filter((p): p is Product => p != null);
    }
    // Fallback: fetch products in pages and filter by store.id (for backends without product_ids)
    const maxPages = 20;
    const perPage = 100;
    const collected: Product[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const batch = await getProducts({ per_page: perPage, page });
      const forVendor = batch.filter((p) => p.store?.id === vendorId);
      collected.push(...forVendor);
      if (batch.length < perPage) break;
    }
    return collected;
  } catch (error) {
    handleApiError(error, `Error fetching products for vendor ${vendorId}`);
    return [];
  }
}