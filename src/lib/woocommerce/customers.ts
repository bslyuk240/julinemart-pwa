import { wcApi, handleApiError } from './client';
import { Customer, BillingAddress, ShippingAddress } from '@/types/customer';

/**
 * Get all customers (admin only)
 */
export async function getCustomers(params: {
  page?: number;
  per_page?: number;
  search?: string;
  email?: string;
  role?: string;
} = {}): Promise<Customer[]> {
  try {
    const response = await wcApi.get('customers', params);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single customer by ID
 */
export async function getCustomer(id: number): Promise<Customer | null> {
  try {
    const response = await wcApi.get(`customers/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get current logged-in customer
 * Note: This requires the customer ID to be stored after login
 */
export async function getCurrentCustomer(customerId: number): Promise<Customer | null> {
  return getCustomer(customerId);
}

/**
 * Update customer information
 */
export async function updateCustomer(
  customerId: number,
  data: Partial<{
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    billing: Partial<BillingAddress>;
    shipping: Partial<ShippingAddress>;
    meta_data: Array<{ key: string; value: any }>;
  }>
): Promise<Customer | null> {
  try {
    const response = await wcApi.put(`customers/${customerId}`, data);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Update customer billing address
 */
export async function updateBillingAddress(
  customerId: number,
  billing: Partial<BillingAddress>
): Promise<Customer | null> {
  return updateCustomer(customerId, { billing });
}

/**
 * Update customer shipping address
 */
export async function updateShippingAddress(
  customerId: number,
  shipping: Partial<ShippingAddress>
): Promise<Customer | null> {
  return updateCustomer(customerId, { shipping });
}

/**
 * Update customer email
 */
export async function updateCustomerEmail(
  customerId: number,
  email: string
): Promise<Customer | null> {
  return updateCustomer(customerId, { email });
}

/**
 * Update customer name
 */
export async function updateCustomerName(
  customerId: number,
  firstName: string,
  lastName: string
): Promise<Customer | null> {
  return updateCustomer(customerId, {
    first_name: firstName,
    last_name: lastName,
  });
}

/**
 * Update customer meta data (for custom fields like preferences)
 */
export async function updateCustomerMetaData(
  customerId: number,
  metaData: Array<{ key: string; value: any }>
): Promise<Customer | null> {
  return updateCustomer(customerId, { meta_data: metaData });
}

/**
 * Add or update a single meta data field
 */
export async function updateCustomerMeta(
  customerId: number,
  key: string,
  value: any
): Promise<Customer | null> {
  try {
    // First get current customer data
    const customer = await getCustomer(customerId);
    if (!customer) return null;

    // Find if meta key exists
    const existingMetaIndex = customer.meta_data.findIndex(m => m.key === key);
    
    let updatedMetaData = [...customer.meta_data];
    
    if (existingMetaIndex !== -1) {
      // Update existing meta
      updatedMetaData[existingMetaIndex] = {
        ...updatedMetaData[existingMetaIndex],
        value,
      };
    } else {
      // Add new meta
      updatedMetaData.push({
        id: 0, // Will be assigned by WooCommerce
        key,
        value,
      });
    }

    return updateCustomer(customerId, { meta_data: updatedMetaData });
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Delete a customer
 */
export async function deleteCustomer(
  customerId: number,
  reassign?: number
): Promise<boolean> {
  try {
    const params: any = { force: true };
    if (reassign) {
      params.reassign = reassign;
    }
    
    await wcApi.delete(`customers/${customerId}`, params);
    return true;
  } catch (error) {
    handleApiError(error);
    return false;
  }
}

/**
 * Create a new customer
 */
export async function createCustomer(data: {
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  billing?: Partial<BillingAddress>;
  shipping?: Partial<ShippingAddress>;
}): Promise<Customer | null> {
  try {
    const response = await wcApi.post('customers', data);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Search customers by email
 */
export async function searchCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const customers = await getCustomers({ email, per_page: 1 });
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get customer notification preferences
 */
export async function getCustomerNotificationPreferences(
  customerId: number
): Promise<{
  orderUpdates: boolean;
  promotions: boolean;
  newsletter: boolean;
  sms: boolean;
  push: boolean;
} | null> {
  try {
    const customer = await getCustomer(customerId);
    if (!customer) return null;

    // Look for notification preferences in meta_data
    const notifMeta = customer.meta_data.find(m => m.key === 'notification_preferences');
    
    if (notifMeta && notifMeta.value) {
      return notifMeta.value;
    }

    // Return defaults if not set
    return {
      orderUpdates: true,
      promotions: true,
      newsletter: false,
      sms: true,
      push: true,
    };
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Update customer notification preferences
 */
export async function updateCustomerNotificationPreferences(
  customerId: number,
  preferences: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
    sms: boolean;
    push: boolean;
  }
): Promise<boolean> {
  try {
    const result = await updateCustomerMeta(
      customerId,
      'notification_preferences',
      preferences
    );
    return result !== null;
  } catch (error) {
    handleApiError(error);
    return false;
  }
}

/**
 * Get customer app preferences
 */
export async function getCustomerAppPreferences(
  customerId: number
): Promise<{
  language: string;
  currency: string;
  theme: string;
} | null> {
  try {
    const customer = await getCustomer(customerId);
    if (!customer) return null;

    const prefMeta = customer.meta_data.find(m => m.key === 'app_preferences');
    
    if (prefMeta && prefMeta.value) {
      return prefMeta.value;
    }

    // Return defaults
    return {
      language: 'en',
      currency: 'NGN',
      theme: 'light',
    };
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Update customer app preferences
 */
export async function updateCustomerAppPreferences(
  customerId: number,
  preferences: {
    language: string;
    currency: string;
    theme: string;
  }
): Promise<boolean> {
  try {
    const result = await updateCustomerMeta(
      customerId,
      'app_preferences',
      preferences
    );
    return result !== null;
  } catch (error) {
    handleApiError(error);
    return false;
  }
}

/**
 * Validate customer credentials (for password verification)
 * Note: This requires WordPress authentication API or JWT
 */
export async function validateCustomerPassword(
  email: string,
  password: string
): Promise<boolean> {
  try {
    // This would typically use WordPress REST API authentication
    // or a custom endpoint you've created
    // For now, return false as this needs custom implementation
    console.warn('Password validation requires WordPress authentication API');
    return false;
  } catch (error) {
    handleApiError(error);
    return false;
  }
}