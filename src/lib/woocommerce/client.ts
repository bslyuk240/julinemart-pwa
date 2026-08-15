import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const isClient = typeof window !== "undefined";
let serverApi: WooCommerceRestApi | null = null;
const WC_REQUEST_TIMEOUT_MS = 8000;

type RequestPayload = {
  params?: unknown;
  data?: unknown;
};

type ApiErrorLike = {
  message?: string;
  response?: {
    status?: number;
  };
  config?: {
    url?: string;
  };
  request?: {
    path?: string;
  };
};

export class WooCommerceRetiredError extends Error {
  constructor() {
    super(
      "WooCommerce API is retired — use Supabase/JLO catalog and order endpoints instead."
    );
    this.name = "WooCommerceRetiredError";
  }
}

// Utility: scrub credentials from URLs/headers before logging
const scrubAuth = (value?: string) =>
  value?.replace(/\/\/([^:]+):([^@]+)@/g, "//***:***@");

export function isWooCommerceConfigured(): boolean {
  return Boolean(
    process.env.WC_BASE_URL &&
      process.env.WC_KEY &&
      process.env.WC_SECRET
  );
}

function getServerApi(): WooCommerceRestApi | null {
  if (isClient) return null;
  if (serverApi) return serverApi;

  const wcBaseUrl = process.env.WC_BASE_URL;
  const consumerKey = process.env.WC_KEY;
  const consumerSecret = process.env.WC_SECRET;

  if (!wcBaseUrl || !consumerKey || !consumerSecret) {
    return null;
  }

  serverApi = new WooCommerceRestApi({
    url: wcBaseUrl.replace("/wp-json/wc/v3", ""),
    consumerKey,
    consumerSecret,
    version: "wc/v3",
    queryStringAuth: true,
    timeout: WC_REQUEST_TIMEOUT_MS,
  });

  return serverApi;
}

async function callProxy(
  method: "get" | "post" | "put" | "delete",
  endpoint: string,
  payload?: RequestPayload
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
  const total = res.headers.get("X-WP-Total");
  const totalPages = res.headers.get("X-WP-TotalPages");
  return {
    data: json,
    ...(total != null && { total: parseInt(total, 10) }),
    ...(totalPages != null && { totalPages: parseInt(totalPages, 10) }),
  };
}

function requireApi(): WooCommerceRestApi {
  const api = getServerApi();
  if (!api) throw new WooCommerceRetiredError();
  return api;
}

// Client-safe wrapper for WooCommerce endpoints (wc/v3)
export const wcApi = {
  get: async (endpoint: string, params?: unknown) => {
    const api = getServerApi();
    if (api) {
      const res = await api.get(endpoint, params);
      const total = res.headers?.["x-wp-total"] ?? res.headers?.["X-WP-Total"];
      const totalPages =
        res.headers?.["x-wp-totalpages"] ?? res.headers?.["X-WP-TotalPages"];
      return {
        data: res.data,
        ...(total != null && { total: parseInt(String(total), 10) }),
        ...(totalPages != null && {
          totalPages: parseInt(String(totalPages), 10),
        }),
      };
    }
    if (isClient) {
      return callProxy("get", endpoint, { params });
    }
    throw new WooCommerceRetiredError();
  },
  post: async (endpoint: string, data?: unknown) => {
    const api = requireApi();
    return api.post(endpoint, data);
  },
  put: async (endpoint: string, data?: unknown) => {
    const api = requireApi();
    return api.put(endpoint, data);
  },
  delete: async (endpoint: string, params?: unknown) => {
    const api = requireApi();
    return api.delete(endpoint, params);
  },
};

export const wpApi = {
  get: async (endpoint: string, params?: unknown) => {
    if (!isWooCommerceConfigured()) throw new WooCommerceRetiredError();
    const data = await callProxy("get", `wp:${endpoint}`, { params });
    return { data };
  },
};

export const handleApiError = (error: unknown, context?: string) => {
  const typedError =
    typeof error === "object" && error !== null ? (error as ApiErrorLike) : undefined;
  const baseInfo = {
    message: typedError?.message ?? String(error),
    status: typedError?.response?.status,
    url: scrubAuth(typedError?.config?.url || typedError?.request?.path),
  };

  if (typedError?.response) console.error(context || "API Error:", baseInfo);
  else if (typedError?.request) console.error(context || "Network Error:", baseInfo);
  else console.error(context || "Error:", baseInfo.message);

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
