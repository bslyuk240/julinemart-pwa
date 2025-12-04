import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const isClient = typeof window !== 'undefined';

const serverApi = !isClient
  ? new WooCommerceRestApi({
      url: process.env.WC_BASE_URL?.replace('/wp-json/wc/v3', '') || '',
      consumerKey: process.env.WC_KEY || '',
      consumerSecret: process.env.WC_SECRET || '',
      version: 'wc/v3',
      queryStringAuth: false,
    })
  : null;

async function callProxy(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, payload?: any) {
  const res = await fetch('/api/woocommerce/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, endpoint, payload }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.message || 'WooCommerce proxy request failed');
  }
  return json;
}

// Client-safe wrapper: uses server API directly on the server, proxy route on the client
export const wcApi = {
  get: async (endpoint: string, params?: any) => {
    if (serverApi) {
      return serverApi.get(endpoint, params);
    }
    const data = await callProxy('get', endpoint, { params });
    return { data };
  },
  post: async (endpoint: string, data?: any) => {
    if (serverApi) {
      return serverApi.post(endpoint, data);
    }
    const proxyData = await callProxy('post', endpoint, { data });
    return { data: proxyData };
  },
  put: async (endpoint: string, data?: any) => {
    if (serverApi) {
      return serverApi.put(endpoint, data);
    }
    const proxyData = await callProxy('put', endpoint, { data });
    return { data: proxyData };
  },
  delete: async (endpoint: string, params?: any) => {
    if (serverApi) {
      return serverApi.delete(endpoint, params);
    }
    const proxyData = await callProxy('delete', endpoint, { params });
    return { data: proxyData };
  },
};

// Helper function for error handling
// Log API errors but do not throw so callers can gracefully fall back.
export const handleApiError = (error: any) => {
  if (error?.response) {
    console.error('API Error:', error.response.data);
  } else if (error?.request) {
    console.error('Network Error:', error.request);
  } else {
    console.error('Error:', error?.message || error);
  }
  return error;
};

// Types for API responses
export interface WooCommerceResponse<T> {
  data: T;
  headers: Record<string, string>;
}

export interface PaginationHeaders {
  'x-wp-total': string;
  'x-wp-totalpages': string;
}
