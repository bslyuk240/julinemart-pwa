import { wcApi, handleApiError } from './client';

export interface ShippingZone {
  id: number;
  name: string;
  order: number;
  _links?: any;
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
  _links?: any;
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
  settings: {
    [key: string]: any;
  };
  _links?: any;
}

/**
 * Get all shipping zones
 */
export async function getShippingZones(): Promise<ShippingZone[]> {
  try {
    const response = await wcApi.get('shipping/zones');
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single shipping zone by ID
 */
export async function getShippingZone(zoneId: number): Promise<ShippingZone | null> {
  try {
    const response = await wcApi.get(`shipping/zones/${zoneId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get shipping methods for a specific zone
 */
export async function getShippingMethods(zoneId: number): Promise<ShippingMethod[]> {
  try {
    const response = await wcApi.get(`shipping/zones/${zoneId}/methods`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get all available shipping methods across all zones
 */
export async function getAllShippingMethods(): Promise<{
  zone: ShippingZone;
  methods: ShippingMethod[];
}[]> {
  try {
    const zones = await getShippingZones();
    
    const zonesWithMethods = await Promise.all(
      zones.map(async (zone) => {
        const methods = await getShippingMethods(zone.id);
        return {
          zone,
          methods: methods.filter(m => m.enabled),
        };
      })
    );
    
    return zonesWithMethods.filter(z => z.methods.length > 0);
  } catch (error) {
    console.error('Error fetching shipping methods:', error);
    return [];
  }
}

/**
 * Calculate shipping for a package
 * Note: This is simplified - actual calculation would need customer address
 */
export async function calculateShipping(
  zoneId: number,
  methodId: string,
  packageData?: {
    destination?: {
      country?: string;
      state?: string;
      postcode?: string;
      city?: string;
    };
    items?: Array<{
      product_id: number;
      quantity: number;
    }>;
  }
): Promise<{
  cost: number;
  label: string;
} | null> {
  try {
    const methods = await getShippingMethods(zoneId);
    const method = methods.find(m => m.method_id === methodId);
    
    if (!method) return null;
    
    // Extract cost from settings
    const costSetting = method.settings?.cost?.value || '0';
    
    return {
      cost: parseFloat(costSetting),
      label: method.title,
    };
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get all payment gateways
 */
export async function getPaymentGateways(): Promise<PaymentGateway[]> {
  try {
    const response = await wcApi.get('payment_gateways');
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get enabled payment gateways only
 */
export async function getEnabledPaymentGateways(): Promise<PaymentGateway[]> {
  try {
    const gateways = await getPaymentGateways();
    return gateways.filter(gateway => gateway.enabled);
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single payment gateway by ID
 */
export async function getPaymentGateway(gatewayId: string): Promise<PaymentGateway | null> {
  try {
    const response = await wcApi.get(`payment_gateways/${gatewayId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}