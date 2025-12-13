import { handleApiError } from './client';
import type { Vendor, VendorQueryParams } from '@/types/vendor';

const DEFAULT_PER_PAGE = 50;

/**
 * IMPORTANT
 * Vendors are WORDPRESS USERS, not WooCommerce resources.
 * Therefore:
 * - ❌ DO NOT use wcApi.get() here
 * - ✅ Always go through Netlify proxy with api: "wp"
 */

/* ----------------------------------------
 * Helpers
 * -------------------------------------- */

async function wpProxyRequest<T>(
  endpoint: string,
  options: {
    method?: 'get' | 'post' | 'put' | 'delete';
    payload?: any;
  } = {}
): Promise<T> {
  const { method = 'get', payload } = options;

  const res = await fetch('/.netlify/functions/woocommerce-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api: 'wp', // 🔑 forces WP JSON base (/wp-json)
      method,
      endpoint,
      payload,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `WP Proxy error (${res.status}): ${errorBody || res.statusText}`
    );
  }

  return res.json();
}

/* ----------------------------------------
 * Public API
 * -------------------------------------- */

/**
 * Get all vendors (server-side filtered by role)
 * Endpoint: /wp-json/julinemart/v1/vendors
 */
export async function getVendors(
  params: VendorQueryParams = {}
): Promise<Vendor[]> {
  try {
    const query = new URLSearchParams({
      per_page: String(params.per_page ?? DEFAULT_PER_PAGE),
      page: String(params.page ?? 1),
      ...(params.search ? { search: params.search } : {}),
      ...(params.orderby ? { orderby: params.orderby } : {}),
      ...(params.order ? { order: params.order } : {}),
    }).toString();

    const endpoint = query
      ? `julinemart/v1/vendors?${query}`
      : 'julinemart/v1/vendors';

    return await wpProxyRequest<Vendor[]>(endpoint);
  } catch (error) {
    handleApiError(error, 'Error fetching vendors');
    return [];
  }
}

/**
 * Get vendor by ID (VALIDATED vendor only)
 * Endpoint: /wp-json/julinemart/v1/vendors/{id}
 */
export async function getVendorById(id: number): Promise<Vendor | null> {
  if (!id || Number.isNaN(id)) return null;

  try {
    return await wpProxyRequest<Vendor>(
      `julinemart/v1/vendors/${id}`
    );
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${id}`);
    return null;
  }
}

/**
 * Get vendor by slug
 * Uses server-side search, then exact match
 */
export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!slug) return null;

  try {
    const vendors = await getVendors({
      per_page: 50,
      search: slug,
    });

    return (
      vendors.find(
        (v) =>
          v.store_slug === slug ||
          v.store_url?.endsWith(`/${slug}`)
      ) || null
    );
  } catch (error) {
    handleApiError(error, `Error fetching vendor for slug "${slug}"`);
    return null;
  }
}
