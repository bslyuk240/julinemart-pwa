import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const isClient = typeof window !== "undefined";
let serverApi: WooCommerceRestApi | null = null;

// Utility: scrub credentials from URLs/headers before logging
const scrubAuth = (value?: string) =>
  value?.replace(/\/\/([^:]+):([^@]+)@/g, "//***:***@");

function getServerApi() {
  if (isClient) return null;
  if (serverApi) return serverApi;

  const wcBaseUrl = process.env.WC_BASE_URL;
  const consumerKey = process.env.WC_KEY;
  const consumerSecret = process.env.WC_SECRET;
  const missing = [
    !wcBaseUrl ? "WC_BASE_URL" : null,
    !consumerKey ? "WC_KEY" : null,
    !consumerSecret ? "WC_SECRET" : null,
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Missing WooCommerce configuration: ${missing.join(", ")}`
    );
  }

  serverApi = new WooCommerceRestApi({
    url: wcBaseUrl!.replace("/wp-json/wc/v3", ""),
    consumerKey: consumerKey!,
    consumerSecret: consumerSecret!,
    version: "wc/v3",
    queryStringAuth: true,
  });

  return serverApi;
}

async function callProxy(
  method: "get" | "post" | "put" | "delete",
  endpoint: string,
  payload?: any
) {
  const res = await fetch("/api/woocommerce/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, endpoint, payload }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || "Proxy request failed");
  }
  // Forward WooCommerce pagination headers so list pages can load all items (e.g. 300+ products)
  const total = res.headers.get("X-WP-Total");
  const totalPages = res.headers.get("X-WP-TotalPages");
  return {
    data: json,
    ...(total != null && { total: parseInt(total, 10) }),
    ...(totalPages != null && { totalPages: parseInt(totalPages, 10) }),
  };
}

// Client-safe wrapper for WooCommerce endpoints (wc/v3)
export const wcApi = {
  get: async (endpoint: string, params?: any) => {
    const api = getServerApi();
    if (api) {
      const res = await api.get(endpoint, params);
      // Normalize: server returns axios-style { data, headers }; add total/totalPages for parity
      const total = res.headers?.["x-wp-total"] ?? res.headers?.["X-WP-Total"];
      const totalPages = res.headers?.["x-wp-totalpages"] ?? res.headers?.["X-WP-TotalPages"];
      return {
        data: res.data,
        ...(total != null && { total: parseInt(String(total), 10) }),
        ...(totalPages != null && { totalPages: parseInt(String(totalPages), 10) }),
      };
    }
    return callProxy("get", endpoint, { params });
  },
  post: async (endpoint: string, data?: any) => {
    const api = getServerApi();
    if (api) return api.post(endpoint, data);
    const proxyData = await callProxy("post", endpoint, { data });
    return { data: proxyData };
  },
  put: async (endpoint: string, data?: any) => {
    const api = getServerApi();
    if (api) return api.put(endpoint, data);
    const proxyData = await callProxy("put", endpoint, { data });
    return { data: proxyData };
  },
  delete: async (endpoint: string, params?: any) => {
    const api = getServerApi();
    if (api) return api.delete(endpoint, params);
    const proxyData = await callProxy("delete", endpoint, { params });
    return { data: proxyData };
  },
};

/**
 * ✅ NEW: Client-safe wrapper for WP/WCFM endpoints (/wp-json/*)
 * - On client: uses proxy (does NOT expose keys)
 * - On server: you can also route through proxy or direct axios, but easiest is proxy only.
 *
 * Endpoint format:
 *   wpApi.get("wcfmmp/v1/vendors/35")
 * This will send "wp:wcfmmp/v1/vendors/35" to the proxy route.
 */
export const wpApi = {
  get: async (endpoint: string, params?: any) => {
    const data = await callProxy("get", `wp:${endpoint}`, { params });
    return { data };
  },
};

// Helper function for error handling
export const handleApiError = (error: any, context?: string) => {
  const baseInfo = {
    message: error?.message,
    status: error?.response?.status,
    url: scrubAuth(error?.config?.url || error?.request?.path),
  };

  if (error?.response) console.error(context || "API Error:", baseInfo);
  else if (error?.request) console.error(context || "Network Error:", baseInfo);
  else console.error(context || "Error:", error?.message || error);

  return error;
};

export interface WooCommerceResponse<T> {
  data: T;
  headers: Record<string, string>;
}

export interface PaginationHeaders {
  "x-wp-total": string;
  "x-wp-totalpages": string;
}
