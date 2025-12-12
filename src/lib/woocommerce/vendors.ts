import { wcApi, handleApiError } from './client';
import { WCFM_ENDPOINTS } from '@/lib/constants';
import { Vendor, VendorQueryParams } from '@/types/vendor';

const DEFAULT_PER_PAGE = 50;

export async function getVendors(params: VendorQueryParams = {}): Promise<Vendor[]> {
  try {
    const response = await wcApi.get(WCFM_ENDPOINTS.VENDORS, {
      ...params,
      per_page: params.per_page ?? DEFAULT_PER_PAGE,
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Error fetching vendors');
    return [];
  }
}

export async function getVendorById(id: number): Promise<Vendor | null> {
  if (!id) return null;

  try {
    const response = await wcApi.get(`${WCFM_ENDPOINTS.VENDORS}/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error, `Error fetching vendor ${id}`);
    return null;
  }
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  if (!slug) return null;

  try {
    const allVendors = await getVendors({ per_page: 200, search: slug });
    return allVendors.find((vendor) => vendor.store_slug === slug) || null;
  } catch (error) {
    handleApiError(error, `Error fetching vendor for slug "${slug}"`);
    return null;
  }
}
