export function getWooBaseUrl() {
  return process.env.NEXT_PUBLIC_WOOCOMMERCE_URL || '';
}

export function getWooAuthHeaders() {
  return {
    Authorization: process.env.WOOCOMMERCE_AUTH || '',
  };
}
