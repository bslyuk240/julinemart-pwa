import { wcApi, handleApiError } from './client';
import { Vendor, VendorQueryParams } from '@/types/vendor';

const DEFAULT_PER_PAGE = 50;

/**
 * BEST SOLUTION: Uses custom WordPress endpoint that filters vendors server-side
 * 
 * Requires WordPress plugin: julinemart-vendor-api-plugin.php
 * Endpoint: /wp-json/julinemart/v1/vendors
 * 
 * This endpoint:
 * - Only returns users with vendor roles (wcfm_vendor, seller, etc.)
 * - Includes all WCFM settings (email, phone, address)
 * - Properly formatted for the Vendor type
 */

/**
 * Get all vendors (only users with vendor role)
 */
export async function getVendors(params: VendorQueryParams = {}): Promise<Vendor[]> {
  try {
    const response = await wcApi.get('julinemart/v1/vendors', {
      per_page: params.per_page ?? DEFAULT_PER_PAGE,
      page: params.page ?? 1,
      search: params.search,
      orderby: params.orderby ?? 'display_name',
      order: params.order ?? 'asc',
    });
    
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error fetching vendors');
    return [];
  }
}

/**
 * Get vendor by ID
 * Validates that the user is actually a vendor
 */
export async function getVendorById(id: number): Promise<Vendor | null> {
  if (!id) return null;

  try {
    const response = await wcApi.get(`julinemart/v1/vendors/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${id}`);
    return null;
  }
}

/**
 * Get vendor by slug
 */
export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!slug) return null;

  try {
    // Search for vendor by slug
    const vendors = await getVendors({ per_page: 1, search: slug });
    
    // Find exact match
    const vendor = vendors.find((v) => v.store_slug === slug);
    
    return vendor || null;
  } catch (error) {
    handleApiError(error, `Error fetching vendor for slug "${slug}"`);
    return null;
  }
}

/**
 * FALLBACK: If custom endpoint not available, use WordPress Users API
 * This is less efficient but works without the plugin
 */
const VENDOR_ROLES = ['wcfm_vendor', 'seller', 'dc_vendor', 'vendor'];

function isVendor(userData: any): boolean {
  const userRoles = userData.roles || [];
  return VENDOR_ROLES.some(role => userRoles.includes(role));
}

export async function getVendorByIdFallback(id: number): Promise<Vendor | null> {
  if (!id) return null;

  try {
    const response = await wcApi.get(`wp/v2/users/${id}`, {
      context: 'edit',
    });
    
    const userData = response.data;
    
    // Verify this user is actually a vendor
    if (!isVendor(userData)) {
      console.warn(`User ${id} is not a vendor. Roles:`, userData.roles);
      return null;
    }
    
    return transformUserToVendor(userData);
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${id}`);
    return null;
  }
}

function transformUserToVendor(userData: any): Vendor {
  let wcfmSettings: any = {};
  if (userData.meta?.wcfmmp_profile_settings) {
    try {
      wcfmSettings = typeof userData.meta.wcfmmp_profile_settings === 'string'
        ? JSON.parse(userData.meta.wcfmmp_profile_settings)
        : userData.meta.wcfmmp_profile_settings;
    } catch (e) {
      console.error('Failed to parse WCFM settings:', e);
    }
  }

  const storeName = 
    wcfmSettings.store_name ||
    userData.meta?.shop_name ||
    userData.name ||
    userData.display_name;

  let vendorAddress = undefined;
  if (wcfmSettings.address) {
    vendorAddress = {
      street_1: wcfmSettings.address.street_1 || '',
      street_2: wcfmSettings.address.street_2 || '',
      city: wcfmSettings.address.city || '',
      zip: wcfmSettings.address.zip || '',
      country: wcfmSettings.address.country || '',
      state: wcfmSettings.address.state || '',
    };
  }

  const phone = 
    wcfmSettings.phone ||
    userData.meta?.wcfm_phone ||
    userData.meta?.billing_phone;

  return {
    id: userData.id,
    store_name: storeName,
    store_url: userData.link || '',
    store_slug: wcfmSettings.store_slug || userData.slug,
    vendor_display_name: userData.display_name,
    vendor_shop_name: storeName,
    vendor_email: userData.email,
    email: userData.email,
    vendor_address: vendorAddress,
    phone: phone,
    banner: wcfmSettings.banner,
    gravatar: userData.avatar_urls?.[96],
    store_logo: wcfmSettings.logo,
    logo: wcfmSettings.logo,
    shop_description: userData.description,
    social: wcfmSettings.social,
    rating: wcfmSettings.rating,
    enabled: userData.meta?.wcfm_vendor_enabled !== 'no',
    registered: userData.registered_date,
  };
}