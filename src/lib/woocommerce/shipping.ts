export interface ShippingZone {
  id: number;
  name: string;
  order: number;
  _links?: unknown;
}

export interface ZoneLocation {
  code: string;
  type: string;
}

export interface ShippingMethod {
  instance_id: number;
  title: string;
  order: number;
  enabled: boolean;
  method_id: string;
  method_title: string;
  method_description: string;
  settings: {
    [key: string]: {
      id: string;
      label: string;
      description: string;
      type: string;
      value: string;
      default: string;
      tip: string;
      placeholder: string;
    };
  };
  _links?: unknown;
}

export interface PaymentGateway {
  id: string;
  title: string;
  description: string;
  order: number;
  enabled: boolean;
  method_title: string;
  method_description: string;
  method_supports: string[];
  settings: Record<string, unknown>;
  _links?: unknown;
}

export interface ShippingZoneWithMethods {
  zone: ShippingZone;
  methods: ShippingMethod[];
  locations: ZoneLocation[];
}

const DEFAULT_FREE_SHIPPING_THRESHOLD = 100000;
const DEFAULT_STANDARD_SHIPPING_COST = 1500;

const DEFAULT_SHIPPING_ZONE: ShippingZone = {
  id: 1,
  name: 'Nigeria',
  order: 0,
};

const DEFAULT_SHIPPING_LOCATIONS: ZoneLocation[] = [{ code: 'NG', type: 'country' }];

const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  {
    instance_id: 1,
    title: 'Standard Delivery',
    order: 0,
    enabled: true,
    method_id: 'flat_rate',
    method_title: 'Flat rate',
    method_description: 'Standard delivery for orders below the free shipping threshold.',
    settings: {
      cost: {
        id: 'cost',
        label: 'Cost',
        description: '',
        type: 'price',
        value: String(DEFAULT_STANDARD_SHIPPING_COST),
        default: String(DEFAULT_STANDARD_SHIPPING_COST),
        tip: '',
        placeholder: '',
      },
      min_amount: {
        id: 'min_amount',
        label: 'Minimum order amount',
        description: '',
        type: 'price',
        value: String(DEFAULT_FREE_SHIPPING_THRESHOLD),
        default: String(DEFAULT_FREE_SHIPPING_THRESHOLD),
        tip: '',
        placeholder: '',
      },
    },
  },
  {
    instance_id: 2,
    title: 'Free Shipping',
    order: 1,
    enabled: true,
    method_id: 'free_shipping',
    method_title: 'Free shipping',
    method_description: 'Free delivery on qualifying orders.',
    settings: {
      cost: {
        id: 'cost',
        label: 'Cost',
        description: '',
        type: 'price',
        value: '0',
        default: '0',
        tip: '',
        placeholder: '',
      },
      min_amount: {
        id: 'min_amount',
        label: 'Minimum order amount',
        description: '',
        type: 'price',
        value: String(DEFAULT_FREE_SHIPPING_THRESHOLD),
        default: String(DEFAULT_FREE_SHIPPING_THRESHOLD),
        tip: '',
        placeholder: '',
      },
    },
  },
];

const DEFAULT_PAYMENT_GATEWAYS: PaymentGateway[] = [
  {
    id: 'paystack',
    title: 'Paystack',
    description: 'Pay securely with Paystack',
    order: 0,
    enabled: true,
    method_title: 'Paystack',
    method_description: 'Pay securely with Paystack',
    method_supports: ['products'],
    settings: {},
  },
  {
    id: 'bank_transfer',
    title: 'Bank Transfer',
    description: 'Transfer funds directly to our bank account',
    order: 1,
    enabled: true,
    method_title: 'Bank Transfer',
    method_description: 'Transfer funds directly to our bank account',
    method_supports: ['products'],
    settings: {},
  },
];

let shippingMethodsCache: Promise<ShippingZoneWithMethods[]> | null = null;
let enabledPaymentGatewaysCache: Promise<PaymentGateway[]> | null = null;

const normalizeLocationValue = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const scoreZoneMatch = (locations: ZoneLocation[], country: string, state?: string) => {
  const normalizedCountry = normalizeLocationValue(country);
  const normalizedState = normalizeLocationValue(state);
  let bestScore = -1;

  for (const location of locations) {
    const locationCode = String(location.code || '').toUpperCase();
    const normalizedCode = normalizeLocationValue(locationCode);

    if (location.type === 'country' && normalizedCode === normalizedCountry) {
      bestScore = Math.max(bestScore, 200);
    }

    if (location.type === 'state' && normalizedState) {
      if (
        normalizedCode === normalizeLocationValue(`${country}:${state}`) ||
        normalizedCode.endsWith(normalizedState)
      ) {
        bestScore = Math.max(bestScore, 300);
      }
    }
  }

  return bestScore;
};

const isRestOfWorldZone = (zone: ShippingZone) => zone.name.trim().toLowerCase() === 'rest of the world';

export function getMatchingShippingZoneData(
  zonesWithMethods: ShippingZoneWithMethods[],
  country: string,
  state?: string
): ShippingZoneWithMethods[] {
  let bestMatch: ShippingZoneWithMethods | null = null;
  let bestScore = -1;

  for (const zoneData of zonesWithMethods) {
    const score = scoreZoneMatch(zoneData.locations, country, state);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = zoneData;
    }
  }

  if (bestMatch && bestScore >= 0) {
    return [bestMatch];
  }

  const restOfWorldZone = zonesWithMethods.find((zoneData) => isRestOfWorldZone(zoneData.zone));
  if (restOfWorldZone) {
    return [restOfWorldZone];
  }

  return zonesWithMethods;
}

export async function getShippingZones(): Promise<ShippingZone[]> {
  return [DEFAULT_SHIPPING_ZONE];
}

export async function getShippingZone(zoneId: number): Promise<ShippingZone | null> {
  return zoneId === DEFAULT_SHIPPING_ZONE.id ? DEFAULT_SHIPPING_ZONE : null;
}

export async function getShippingMethods(zoneId: number): Promise<ShippingMethod[]> {
  return zoneId === DEFAULT_SHIPPING_ZONE.id ? DEFAULT_SHIPPING_METHODS : [];
}

export async function getShippingZoneLocations(zoneId: number): Promise<ZoneLocation[]> {
  return zoneId === DEFAULT_SHIPPING_ZONE.id ? DEFAULT_SHIPPING_LOCATIONS : [];
}

export async function getAllShippingMethods(): Promise<ShippingZoneWithMethods[]> {
  if (!shippingMethodsCache) {
    shippingMethodsCache = Promise.resolve([
      {
        zone: DEFAULT_SHIPPING_ZONE,
        methods: DEFAULT_SHIPPING_METHODS.filter((method) => method.enabled),
        locations: DEFAULT_SHIPPING_LOCATIONS,
      },
    ]);
  }

  return shippingMethodsCache;
}

export async function calculateShipping(
  zoneId: number,
  methodId: string
): Promise<{ cost: number; label: string } | null> {
  const methods = await getShippingMethods(zoneId);
  const method = methods.find((m) => m.method_id === methodId);
  if (!method) return null;

  const costSetting = method.settings?.cost?.value || '0';
  return {
    cost: parseFloat(costSetting),
    label: method.title,
  };
}

export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  return DEFAULT_PAYMENT_GATEWAYS;
}

export async function getEnabledPaymentGateways(): Promise<PaymentGateway[]> {
  if (!enabledPaymentGatewaysCache) {
    enabledPaymentGatewaysCache = Promise.resolve(DEFAULT_PAYMENT_GATEWAYS.filter((gateway) => gateway.enabled));
  }

  return enabledPaymentGatewaysCache;
}

export async function getPaymentGateway(gatewayId: string): Promise<PaymentGateway | null> {
  return DEFAULT_PAYMENT_GATEWAYS.find((gateway) => gateway.id === gatewayId) ?? null;
}
