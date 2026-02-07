/**
 * Updated Vendor Service for PWA - API ROUTE VERSION
 * Uses Next.js API routes to avoid CORS issues
 * 
 * Location: src/lib/woocommerce/vendors-custom.ts
 */

import { handleApiError } from './client';
import { Vendor } from '@/types/vendor';

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