import { APP_URL } from '@/lib/constants';

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

type JloShippingSettingsResponse = {
  success: boolean;
  data?: ShippingZoneWithMethods[];
  message?: string;
};

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
];

let shippingMethodsCache: Promise<ShippingZoneWithMethods[]> | null = null;
let enabledPaymentGatewaysCache: Promise<PaymentGateway[]> | null = null;

const normalizeLocationValue = (value: string | undefined | null) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const pickDefaultZone = (zonesWithMethods: ShippingZoneWithMethods[]) => {
  if (zonesWithMethods.length === 0) return null;

  const ordered = [...zonesWithMethods].sort((a, b) => {
    const aCost = Number(a.methods[0]?.settings?.cost?.value ?? Number.POSITIVE_INFINITY);
    const bCost = Number(b.methods[0]?.settings?.cost?.value ?? Number.POSITIVE_INFINITY);
    if (aCost !== bCost) return aCost - bCost;

    const aOrder = Number(a.zone.order ?? 0);
    const bOrder = Number(b.zone.order ?? 0);
    if (aOrder !== bOrder) return aOrder - bOrder;

    return a.zone.name.localeCompare(b.zone.name);
  });

  return ordered[0] || null;
};

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

async function fetchShippingSettings(): Promise<ShippingZoneWithMethods[]> {
  const baseUrl = APP_URL.replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/jlo/shipping-settings`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch shipping settings');
  }

  const payload = (await response.json()) as JloShippingSettingsResponse;
  if (!payload.success || !Array.isArray(payload.data)) {
    return [];
  }

  return payload.data;
}

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

  const defaultZone = pickDefaultZone(zonesWithMethods);
  return defaultZone ? [defaultZone] : zonesWithMethods;
}

export async function getShippingZones(): Promise<ShippingZone[]> {
  const zones = await getAllShippingMethods();
  return zones.map(({ zone }) => zone);
}

export async function getShippingZone(zoneId: number): Promise<ShippingZone | null> {
  const zones = await getAllShippingMethods();
  return zones.find((entry) => entry.zone.id === zoneId)?.zone ?? null;
}

export async function getShippingMethods(zoneId: number): Promise<ShippingMethod[]> {
  const zones = await getAllShippingMethods();
  return zones.find((entry) => entry.zone.id === zoneId)?.methods ?? [];
}

export async function getShippingZoneLocations(zoneId: number): Promise<ZoneLocation[]> {
  const zones = await getAllShippingMethods();
  return zones.find((entry) => entry.zone.id === zoneId)?.locations ?? [];
}

export async function getAllShippingMethods(): Promise<ShippingZoneWithMethods[]> {
  if (!shippingMethodsCache) {
    shippingMethodsCache = fetchShippingSettings().catch((error) => {
      console.error('Failed to load JLO shipping settings:', error);
      return [];
    });
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
