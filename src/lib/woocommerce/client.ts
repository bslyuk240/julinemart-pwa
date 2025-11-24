import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

// Initialize WooCommerce REST API client
export const wcApi = new WooCommerceRestApi({
  url: process.env.NEXT_PUBLIC_WC_BASE_URL?.replace('/wp-json/wc/v3', '') || '',
  consumerKey: process.env.NEXT_PUBLIC_WC_KEY || '',
  consumerSecret: process.env.NEXT_PUBLIC_WC_SECRET || '',
  version: 'wc/v3',
  queryStringAuth: true, // Force Basic Authentication as query string
});

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
