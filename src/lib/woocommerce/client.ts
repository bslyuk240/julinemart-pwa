import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const isClient = typeof window !== 'undefined';

const serverApi = !isClient
  ? new WooCommerceRestApi({
      url: process.env.WC_BASE_URL?.replace('/wp-json/wc/v3', '') || '',
      consumerKey: process.env.WC_CONSUMER_KEY || process.env.WC_KEY || '',
      consumerSecret: process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET || '',
      version: 'wc/v3',
      queryStringAuth: true,
      timeout: 60000,
    })
  : null;

async function callProxy(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, payload?: any) {
  // Use Netlify function instead of Next.js API route
  const proxyUrl = '/.netlify/functions/woocommerce-proxy';
  
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, endpoint, payload }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.message || 'WooCommerce proxy request failed');
  }

  return res.json();
}

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

export const handleApiError = (error: any, context?: string) => {
  const baseInfo = {
    message: error?.message,
    status: error?.response?.status,
  };

  console.error(context || 'API Error:', baseInfo);
  return error;
};

export interface WooCommerceResponse<T> {
  data: T;
  headers: Record<string, string>;
}

export interface PaginationHeaders {
  'x-wp-total': string;
  'x-wp-totalpages': string;
}