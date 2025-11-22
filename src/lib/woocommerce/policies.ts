import { wcApi, handleApiError } from './client';

/**
 * Store Policies
 * These are typically stored as WordPress options or WooCommerce settings
 */

export interface StorePolicies {
  returnPolicy: {
    enabled: boolean;
    days: number;
    description?: string;
  };
  shippingPolicy: {
    freeShippingThreshold: number;
    description?: string;
  };
  privacyPolicy?: string;
  termsAndConditions?: string;
  refundPolicy?: string;
}

// Cache for policies
let policiesCache: StorePolicies | null = null;
let lastFetched = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get store policies from WooCommerce meta data
 * This requires custom implementation on WordPress side
 */
export async function getStorePolicies(forceRefresh = false): Promise<StorePolicies> {
  const now = Date.now();
  
  if (!forceRefresh && policiesCache && (now - lastFetched < CACHE_DURATION)) {
    return policiesCache;
  }

  try {
    // Try to fetch from system status or settings
    // Note: This endpoint might need customization on your WordPress site
    const response = await wcApi.get('system_status');
    const settings = response.data.settings || {};
    
    // Extract return policy days (commonly stored as metadata)
    const returnDays = parseInt(settings.woocommerce_return_days || '3');
    const freeShippingThreshold = parseFloat(settings.woocommerce_free_shipping_min || '10000');
    
    const policies: StorePolicies = {
      returnPolicy: {
        enabled: true,
        days: returnDays,
        description: settings.woocommerce_return_policy_text || 
          `Items can be returned within ${returnDays} days of delivery in original condition.`,
      },
      shippingPolicy: {
        freeShippingThreshold: freeShippingThreshold,
        description: settings.woocommerce_shipping_policy_text || 
          `Free shipping on orders over ₦${freeShippingThreshold.toLocaleString()}`,
      },
      privacyPolicy: settings.woocommerce_privacy_policy || undefined,
      termsAndConditions: settings.woocommerce_terms || undefined,
      refundPolicy: settings.woocommerce_refund_policy || undefined,
    };
    
    policiesCache = policies;
    lastFetched = now;
    
    return policies;
  } catch (error) {
    console.error('Error fetching store policies:', error);
    
    // Return default policies based on Nigerian e-commerce standards
    return getDefaultPolicies();
  }
}

/**
 * Get default policies (fallback)
 */
function getDefaultPolicies(): StorePolicies {
  return {
    returnPolicy: {
      enabled: true,
      days: 3, // Your current setting
      description: 'Items can be returned within 3 days of delivery in original condition.',
    },
    shippingPolicy: {
      freeShippingThreshold: 10000,
      description: 'Free shipping on orders over ₦10,000. Standard shipping takes 3-7 business days.',
    },
  };
}

/**
 * Get return policy days
 */
export async function getReturnPolicyDays(): Promise<number> {
  const policies = await getStorePolicies();
  return policies.returnPolicy.days;
}

/**
 * Get free shipping threshold
 */
export async function getFreeShippingThreshold(): Promise<number> {
  const policies = await getStorePolicies();
  return policies.shippingPolicy.freeShippingThreshold;
}

/**
 * Check if returns are enabled
 */
export async function areReturnsEnabled(): Promise<boolean> {
  const policies = await getStorePolicies();
  return policies.returnPolicy.enabled;
}

/**
 * Clear policies cache
 */
export function clearPoliciesCache() {
  policiesCache = null;
  lastFetched = 0;
}

/**
 * Format return policy text for display
 */
export function formatReturnPolicyText(days: number): string {
  if (days === 0) {
    return 'No returns accepted';
  }
  if (days === 1) {
    return 'Same-day return policy';
  }
  return `${days}-day return policy`;
}