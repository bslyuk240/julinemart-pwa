import { wpApi, handleApiError } from "./client";
import { WCFM_API_PREFIXES, WCFM_ENDPOINTS } from "@/lib/constants";
import { Vendor, VendorQueryParams } from "@/types/vendor";

const DEFAULT_PER_PAGE = 50;

const isWcfmRouteNotFound = (error: any) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || "");
  const code = String(error?.response?.data?.code || "");

  return (
    status === 404 ||
    /no route/i.test(message) ||
    code.toLowerCase().startsWith("rest_no_route")
  );
};

/**
 * Tries multiple WCFM prefixes until one works.
 * This is useful because WCFM can expose endpoints under different namespaces
 * depending on version/addons (e.g. wcfmmp/v1 vs wcfm/v1).
 *
 * IMPORTANT: We use wpApi (not wcApi) because WCFM is not under wc/v3.
 */
async function requestWcfmEndpoint<T>(
  endpointPath: string,
  params?: any
): Promise<T> {
  let lastError: any = null;

  for (const prefix of WCFM_API_PREFIXES) {
    const endpoint = `${prefix}${endpointPath}`;

    try {
      const response = await wpApi.get(endpoint, params);
      return response.data as T;
    } catch (error: any) {
      if (isWcfmRouteNotFound(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError ?? new Error("No WCFM endpoint matched the request");
}

export async function getVendors(
  params: VendorQueryParams = {}
): Promise<Vendor[]> {
  try {
    const response = await requestWcfmEndpoint<Vendor[]>(
      WCFM_ENDPOINTS.VENDORS,
      {
        ...params,
        per_page: params.per_page ?? DEFAULT_PER_PAGE,
      }
    );
    return response;
  } catch (error) {
    handleApiError(error, "Error fetching vendors");
    return [];
  }
}

export async function getVendorById(id: number): Promise<Vendor | null> {
  if (!id) return null;

  try {
    const endpoint = `${WCFM_ENDPOINTS.VENDORS}/${id}`;
    const response = await requestWcfmEndpoint<Vendor>(endpoint);
    return response;
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