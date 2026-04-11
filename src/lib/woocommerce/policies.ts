import { getAllShippingMethods } from './shipping';

/**
 * Store Policies Management
 * Static defaults plus synthetic shipping data after the Supabase migration.
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
const CACHE_DURATION = 30 * 60 * 1000;

export async function getStorePolicies(forceRefresh = false): Promise<StorePolicies> {
  const now = Date.now();
  if (!forceRefresh && policiesCache && now - lastFetched < CACHE_DURATION) {
    return policiesCache;
  }

  const zonesWithMethods = await getAllShippingMethods();
  const shippingMethods = zonesWithMethods.flatMap((zone) =>
    zone.methods.map((method) => ({
      title: method.title,
      cost: parseFloat(method.settings?.cost?.value || '0'),
      estimatedDays: method.settings?.estimated_delivery?.value || '3-7 business days',
    }))
  );

  let freeShippingThreshold = 0;
  for (const zone of zonesWithMethods) {
    for (const method of zone.methods) {
      const minAmount = method.settings?.min_amount?.value;
      if (minAmount) {
        freeShippingThreshold = Math.max(freeShippingThreshold, parseFloat(minAmount));
      }
    }
  }

  policiesCache = {
    returnPolicy: {
      enabled: true,
      days: 3,
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
      freeShippingThreshold,
      description:
        freeShippingThreshold > 0
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

  lastFetched = now;
  return policiesCache;
}

export async function getReturnPolicy(): Promise<ReturnPolicy> {
  const policies = await getStorePolicies();
  return policies.returnPolicy;
}

export async function getRefundPolicy(): Promise<RefundPolicy> {
  const policies = await getStorePolicies();
  return policies.refundPolicy;
}

export async function getShippingPolicy(): Promise<ShippingPolicy> {
  const policies = await getStorePolicies();
  return policies.shippingPolicy;
}

export async function getReturnPolicyDays(): Promise<number> {
  const policies = await getStorePolicies();
  return policies.returnPolicy.days;
}

export async function getFreeShippingThreshold(): Promise<number> {
  const policies = await getStorePolicies();
  return policies.shippingPolicy.freeShippingThreshold;
}

export async function areReturnsEnabled(): Promise<boolean> {
  const policies = await getStorePolicies();
  return policies.returnPolicy.enabled;
}

export async function isFreeShippingAvailable(orderTotal: number): Promise<boolean> {
  const threshold = await getFreeShippingThreshold();
  return threshold > 0 && orderTotal >= threshold;
}

export async function getShippingCost(orderTotal: number): Promise<number> {
  const isFree = await isFreeShippingAvailable(orderTotal);
  if (isFree) {
    return 0;
  }

  const policies = await getStorePolicies();
  const methods = policies.shippingPolicy.methods;
  if (methods.length > 0) {
    return methods[0].cost;
  }

  return 0;
}

export function clearPoliciesCache() {
  policiesCache = null;
  lastFetched = 0;
}

export function formatReturnPolicyText(days: number): string {
  if (days === 0) {
    return 'No returns accepted';
  }
  if (days === 1) {
    return 'Same-day return policy';
  }
  return `${days}-day return policy`;
}

export function formatShippingThresholdText(threshold: number): string {
  if (threshold === 0) {
    return 'Standard shipping rates apply';
  }
  return `Free shipping on orders over ₦${threshold.toLocaleString()}`;
}

export async function getPrivacyPolicyUrl(): Promise<string> {
  const policies = await getStorePolicies();
  return policies.privacyPolicy.url;
}

export async function getTermsConditionsUrl(): Promise<string> {
  const policies = await getStorePolicies();
  return policies.termsConditions.url;
}
