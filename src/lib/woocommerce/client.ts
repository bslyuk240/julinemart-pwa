import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const isClient = typeof window !== 'undefined';

// Utility: scrub credentials from URLs/headers before logging
const scrubAuth = (value?: string) =>
  value?.replace(/\/\/([^:]+):([^@]+)@/g, '//***:***@');

const serverApi = !isClient
  ? new WooCommerceRestApi({
      url: process.env.WC_BASE_URL?.replace('/wp-json/wc/v3', '') || '',
      consumerKey: process.env.WC_CONSUMER_KEY || process.env.WC_KEY || '',
      consumerSecret: process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET || '',
      version: 'wc/v3',
      queryStringAuth: true,
      timeout: 60000, // Increase timeout to 60 seconds
    })
  : null;

async function callProxy(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, payload?: any, retries = 2) {
  let lastError;
  
  // Retry logic for ECONNRESET errors
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('/api/woocommerce/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, endpoint, payload }),
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json?.message || 'WooCommerce proxy request failed');
      }
      
      return json;
    } catch (error: any) {
      lastError = error;
      
      // If it's a connection reset and we have retries left, try again
      if ((error.message?.includes('ECONNRESET') || error.message?.includes('fetch failed')) && attempt < retries) {
        console.log(`Connection reset, retrying (${attempt + 1}/${retries})...`);
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      // If it's not a retryable error or we're out of retries, throw
      throw error;
    }
  }
  
  throw lastError;
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
export const handleApiError = (error: any, context?: string) => {
  const baseInfo = {
    message: error?.message,
    status: error?.response?.status,
    url: scrubAuth(error?.config?.url || error?.request?.path),
  };

  if (error?.response) {
    console.error(context || 'API Error:', baseInfo);
  } else if (error?.request) {
    console.error(context || 'Network Error (sanitized):', baseInfo);
  } else {
    console.error(context || 'Error:', error?.message || error);
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