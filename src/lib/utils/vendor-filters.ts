/**
 * Vendor Filtering Utilities
 * Works on both server-side (Server Components) and client-side (Client Components)
 */

import { Product } from '@/types/product';

/**
 * Get all vendors status - SERVER SIDE VERSION
 * Calls WordPress directly (not through API route)
 */
async function getAllVendorsStatusServer(): Promise<Array<{
  id: number;
  store_name: string;
  enabled: boolean;
  is_store_vacation: boolean;
  is_active: boolean;
}>> {
  try {
    // Use full WordPress URL for server-side calls
    const baseUrl = process.env.WC_BASE_URL?.replace('/wc/v3', '') || 
                    process.env.NEXT_PUBLIC_WC_BASE_URL?.replace('/wc/v3', '') || '';
    
    if (!baseUrl) {
      console.error('❌ No base URL configured');
      return [];
    }
    
    const url = `${baseUrl}/julinemart/v1/vendors-status`;
    
    console.log(`📡 [SERVER] Fetching vendors from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Don't cache on server - always get fresh data
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`❌ [SERVER] Vendor API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ [SERVER] Fetched ${data.length} vendors`);
    return data;
    
  } catch (error: any) {
    console.error('❌ [SERVER] Error fetching vendors:', error.message);
    return [];
  }
}

/**
 * Get all vendors status - CLIENT SIDE VERSION
 * Calls Next.js API route
 */
async function getAllVendorsStatusClient(): Promise<Array<{
  id: number;
  store_name: string;
  enabled: boolean;
  is_store_vacation: boolean;
  is_active: boolean;
}>> {
  try {
    const url = '/api/vendors/status';
    
    console.log(`📡 [CLIENT] Fetching vendors from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ [CLIENT] Vendor API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ [CLIENT] Fetched ${data.length} vendors`);
    return data;
    
  } catch (error: any) {
    console.error('❌ [CLIENT] Error fetching vendors:', error.message);
    return [];
  }
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
  } else {
    return getAllVendorsStatusClient();
  }
}

/**
 * Filter products to only show those from active vendors
 * Works on both server-side (SSR) and client-side
 */
export async function filterActiveVendorProducts(products: Product[]): Promise<Product[]> {
  if (!products || products.length === 0) {
    return [];
  }

  console.log(`📦 Filtering ${products.length} products...`);

  try {
    // Get all vendors with their status
    const vendors = await getAllVendors();
    
    if (vendors.length === 0) {
      console.warn('⚠️ No vendors fetched - showing all products (fail-safe)');
      return products;
    }

    // Create a Set of active vendor IDs for fast lookup
    const activeVendorIds = new Set(
      vendors
        .filter(v => v.is_active === true)
        .map(v => v.id)
    );

    console.log(`✅ Active vendors: ${activeVendorIds.size} out of ${vendors.length}`);

    // Filter products
    const filtered = products.filter(product => {
      const vendorId = product.store?.id;
      
      if (!vendorId) {
        console.warn(`⚠️ Product ${product.id} has no vendor - keeping it`);
        return true; // Keep products without vendor
      }

      const isActive = activeVendorIds.has(vendorId);
      
      if (!isActive) {
        console.log(`🚫 Hiding product "${product.name}" - vendor ${vendorId} is inactive`);
      }
      
      return isActive;
    });

    console.log(`✅ Filter complete: ${filtered.length} products (removed ${products.length - filtered.length})`);
    
    return filtered;
    
  } catch (error: any) {
    console.error('❌ Error filtering products:', error.message);
    // On error, return all products (fail-safe)
    return products;
  }
}