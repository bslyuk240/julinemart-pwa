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
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error
    console.error('API Error:', error.response.data);
    throw new Error(error.response.data.message || 'API request failed');
  } else if (error.request) {
    // Request made but no response
    console.error('Network Error:', error.request);
    throw new Error('Network error - please check your connection');
  } else {
    // Something else happened
    console.error('Error:', error.message);
    throw new Error(error.message);
  }
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