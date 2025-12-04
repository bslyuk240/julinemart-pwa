import { wcApi, handleApiError } from './client';
import { getAllShippingMethods } from './shipping';

/**
 * Store Policies Management
 * Fetches return, refund, shipping, and privacy policies from WooCommerce
 */

export interface ReturnPolicy {
  enabled: boolean;
  days: number;
  description: string;
  conditions: string[];
}

export interface RefundPolicy {
  enabled: boolean;
  days: number;
  description: string;
  conditions: string[];
}

export interface ShippingPolicy {
  freeShippingThreshold: number;
  description: string;
  methods: Array<{
    title: string;
    cost: number;
    estimatedDays: string;
  }>;
}

export interface PrivacyPolicy {
  url: string;
  content: string;
}

export interface TermsConditions {
  url: string;
  content: string;
}

export interface StorePolicies {
  returnPolicy: ReturnPolicy;
  refundPolicy: RefundPolicy;
  shippingPolicy: ShippingPolicy;
  privacyPolicy: PrivacyPolicy;
  termsConditions: TermsConditions;
}

let policiesCache: StorePolicies | null = null;
let lastFetched = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

/**
 * Get all store policies from WooCommerce settings and pages
 */
export async function getStorePolicies(forceRefresh = false): Promise<StorePolicies> {
  const now = Date.now();
  
  if (!forceRefresh && policiesCache && (now - lastFetched < CACHE_DURATION)) {
    return policiesCache;
  }

  try {
    // Fetch settings from WooCommerce
    const settingsResponse = await wcApi.get('settings/general');
    const settings = settingsResponse.data;

    // Get WooCommerce pages
    const pagesResponse = await wcApi.get('settings/advanced', {
      params: { group: 'page_setup' }
    });
    
    // Get shipping methods for shipping policy
    const zonesWithMethods = await getAllShippingMethods();
    const shippingMethods = zonesWithMethods.flatMap(z => z.methods.map(m => ({
      title: m.title,
      cost: parseFloat(m.settings?.cost?.value || '0'),
      estimatedDays: m.settings?.estimated_delivery?.value || '3-7 business days',
    })));

    // Check for free shipping and get threshold
    let freeShippingThreshold = 0;
    for (const zone of zonesWithMethods) {
      for (const method of zone.methods) {
        if (method.method_id === 'free_shipping') {
          const minAmount = method.settings?.min_amount?.value;
          if (minAmount) {
            freeShippingThreshold = Math.max(freeShippingThreshold, parseFloat(minAmount));
          }
        }
      }
    }

    // Build policies object
    const policies: StorePolicies = {
      returnPolicy: {
        enabled: true,
        days: 3, // Default 3 days - can be customized via WooCommerce settings
        description: 'We offer a hassle-free return policy. Items can be returned within 3 days for a full refund.',
        conditions: [
          'Items must be unused and in original packaging',
          'Proof of purchase required',
          'Perishable goods cannot be returned',
          'Sale items may not be eligible for returns',
        ],
      },
      refundPolicy: {
        enabled: true,
        days: 3,
        description: 'Refunds are processed within 5-10 business days after we receive your returned item (requests accepted within 3 days).',
        conditions: [
          'Item must meet return policy conditions',
          'Refunds are issued to the original payment method',
          'Shipping costs are non-refundable',
          'Partial refunds may apply to damaged items',
        ],
      },
      shippingPolicy: {
        freeShippingThreshold: freeShippingThreshold,
        description: freeShippingThreshold > 0 
          ? `Free shipping on orders over ₦${freeShippingThreshold.toLocaleString()}. Standard shipping rates apply for orders below this threshold.`
          : 'Shipping rates calculated at checkout based on destination and package size.',
        methods: shippingMethods,
      },
      privacyPolicy: {
        url: '/privacy-policy',
        content: 'We value your privacy and protect your personal information. View our full privacy policy for details.',
      },
      termsConditions: {
        url: '/terms-and-conditions',
        content: 'By using our service, you agree to these terms and conditions. Please read them carefully.',
      },
    };

    // Try to get custom policy settings from WooCommerce (if configured)
    try {
      // Attempt to fetch custom return days from WooCommerce settings
      const advancedSettings = await wcApi.get('settings/advanced');
      const returnDaysSetting = advancedSettings.data.find((s: any) => 
        s.id === 'return_policy_days' || s.id === 'woocommerce_return_policy_days'
      );
      
      if (returnDaysSetting && returnDaysSetting.value) {
        policies.returnPolicy.days = parseInt(returnDaysSetting.value);
      }
    } catch (error) {
      // Custom settings not available, use defaults
      console.log('Using default policy settings');
    }

    policiesCache = policies;
    lastFetched = now;
    
    return policies;
  } catch (error) {
    handleApiError(error);
    
    // Return sensible defaults if WooCommerce fetch fails
    return {
      returnPolicy: {
        enabled: true,
        days: 3,
        description: 'We offer a 3-day return policy on most items.',
        conditions: [
          'Items must be unused and in original packaging',
          'Proof of purchase required',
        ],
      },
      refundPolicy: {
        enabled: true,
        days: 3,
        description: 'Refunds processed within 5-10 business days (requests accepted within 3 days).',
        conditions: [
          'Item must meet return policy conditions',
          'Refunds issued to original payment method',
        ],
      },
      shippingPolicy: {
        freeShippingThreshold: 0,
        description: 'Shipping rates calculated at checkout.',
        methods: [],
      },
      privacyPolicy: {
        url: '/privacy-policy',
        content: 'We value your privacy.',
      },
      termsConditions: {
        url: '/terms-and-conditions',
        content: 'Please read our terms carefully.',
      },
    };
  }
}

/**
 * Get return policy
 */
export async function getReturnPolicy(): Promise<ReturnPolicy> {
  const policies = await getStorePolicies();
  return policies.returnPolicy;
}

/**
 * Get refund policy
 */
export async function getRefundPolicy(): Promise<RefundPolicy> {
  const policies = await getStorePolicies();
  return policies.refundPolicy;
}

/**
 * Get shipping policy
 */
export async function getShippingPolicy(): Promise<ShippingPolicy> {
  const policies = await getStorePolicies();
  return policies.shippingPolicy;
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
 * Check if free shipping is available
 */
export async function isFreeShippingAvailable(orderTotal: number): Promise<boolean> {
  const threshold = await getFreeShippingThreshold();
  return threshold > 0 && orderTotal >= threshold;
}

/**
 * Get shipping cost based on order total
 */
export async function getShippingCost(orderTotal: number): Promise<number> {
  const isFree = await isFreeShippingAvailable(orderTotal);
  if (isFree) {
    return 0;
  }

  const policies = await getStorePolicies();
  const methods = policies.shippingPolicy.methods;
  
  // Return cost of first available shipping method
  if (methods.length > 0) {
    return methods[0].cost;
  }

  return 0;
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

/**
 * Format shipping threshold text
 */
export function formatShippingThresholdText(threshold: number): string {
  if (threshold === 0) {
    return 'Standard shipping rates apply';
  }
  return `Free shipping on orders over ₦${threshold.toLocaleString()}`;
}

/**
 * Get privacy policy URL
 */
export async function getPrivacyPolicyUrl(): Promise<string> {
  const policies = await getStorePolicies();
  return policies.privacyPolicy.url;
}

/**
 * Get terms and conditions URL
 */
export async function getTermsConditionsUrl(): Promise<string> {
  const policies = await getStorePolicies();
  return policies.termsConditions.url;
}
