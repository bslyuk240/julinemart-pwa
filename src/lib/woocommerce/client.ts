import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const isClient = typeof window !== "undefined";

// Utility: scrub credentials from URLs/headers before logging
const scrubAuth = (value?: string) =>
  value?.replace(/\/\/([^:]+):([^@]+)@/g, "//***:***@");

// SERVER-ONLY WC client (wc/v3)
const serverApi = !isClient
  ? new WooCommerceRestApi({
      url: process.env.WC_BASE_URL?.replace("/wp-json/wc/v3", "") || "",
      consumerKey: process.env.WC_CONSUMER_KEY || process.env.WC_KEY || "",
      consumerSecret: process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET || "",
      version: "wc/v3",
      queryStringAuth: true,
    })
  : null;

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
  return json;
}

// Client-safe wrapper for WooCommerce endpoints (wc/v3)
export const wcApi = {
  get: async (endpoint: string, params?: any) => {
    if (serverApi) return serverApi.get(endpoint, params);
    const data = await callProxy("get", endpoint, { params });
    return { data };
  },
  post: async (endpoint: string, data?: any) => {
    if (serverApi) return serverApi.post(endpoint, data);
    const proxyData = await callProxy("post", endpoint, { data });
    return { data: proxyData };
  },
  put: async (endpoint: string, data?: any) => {
    if (serverApi) return serverApi.put(endpoint, data);
    const proxyData = await callProxy("put", endpoint, { data });
    return { data: proxyData };
  },
  delete: async (endpoint: string, params?: any) => {
    if (serverApi) return serverApi.delete(endpoint, params);
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