import { wcApi, handleApiError } from './client';

/**
 * WooCommerce Store Settings
 */

export interface TaxSettings {
  woocommerce_calc_taxes: string; // 'yes' or 'no'
  woocommerce_prices_include_tax: string; // 'yes' or 'no'
  woocommerce_tax_display_shop: string; // 'incl' or 'excl'
  woocommerce_tax_display_cart: string; // 'incl' or 'excl'
  woocommerce_tax_round_at_subtotal: string; // 'yes' or 'no'
  woocommerce_tax_classes: string; // Tax class labels
  woocommerce_tax_based_on: string; // 'shipping', 'billing', or 'base'
}

export interface GeneralSettings {
  woocommerce_store_address?: string;
  woocommerce_store_address_2?: string;
  woocommerce_store_city?: string;
  woocommerce_default_country?: string;
  woocommerce_store_postcode?: string;
  woocommerce_currency?: string;
  woocommerce_currency_pos?: string;
  woocommerce_price_thousand_sep?: string;
  woocommerce_price_decimal_sep?: string;
  woocommerce_price_num_decimals?: string;
}

export interface ShippingSettings {
  woocommerce_shipping_cost_requires_address: string;
  woocommerce_enable_shipping_calc: string;
  woocommerce_shipping_debug_mode: string;
}

export interface CouponSettings {
  woocommerce_enable_coupons: string; // 'yes' or 'no'
  woocommerce_calc_discounts_sequentially: string; // 'yes' or 'no'
}

export interface ProductSettings {
  woocommerce_manage_stock: string; // 'yes' or 'no'
  woocommerce_notify_low_stock: string; // 'yes' or 'no'
  woocommerce_notify_no_stock: string; // 'yes' or 'no'
  woocommerce_stock_format: string;
  woocommerce_enable_reviews: string; // 'yes' or 'no'
  woocommerce_review_rating_required: string; // 'yes' or 'no'
}

export interface AccountSettings {
  woocommerce_enable_guest_checkout: string; // 'yes' or 'no'
  woocommerce_enable_signup_and_login_from_checkout: string; // 'yes' or 'no'
  woocommerce_enable_myaccount_registration: string; // 'yes' or 'no'
}

// Store settings cache
let settingsCache: {
  tax?: TaxSettings;
  general?: GeneralSettings;
  shipping?: ShippingSettings;
  coupons?: CouponSettings;
  products?: ProductSettings;
  account?: AccountSettings;
  lastFetched?: number;
} = {};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all settings for a specific group
 */
async function getSettingGroup(group: string): Promise<any> {
  try {
    const response = await wcApi.get(`settings/${group}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Convert settings array to object
 */
function settingsArrayToObject(settings: any[]): any {
  const obj: any = {};
  settings.forEach(setting => {
    obj[setting.id] = setting.value;
  });
  return obj;
}

/**
 * Get tax settings
 */
export async function getTaxSettings(forceRefresh = false): Promise<TaxSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.tax && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.tax;
  }

  try {
    const settings = await getSettingGroup('tax');
    const taxSettings = settingsArrayToObject(settings) as TaxSettings;
    
    settingsCache.tax = taxSettings;
    settingsCache.lastFetched = now;
    
    return taxSettings;
  } catch (error) {
    console.error('Error fetching tax settings:', error);
    return null;
  }
}

/**
 * Get general settings
 */
export async function getGeneralSettings(forceRefresh = false): Promise<GeneralSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.general && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.general;
  }

  try {
    const settings = await getSettingGroup('general');
    const generalSettings = settingsArrayToObject(settings) as GeneralSettings;
    
    settingsCache.general = generalSettings;
    settingsCache.lastFetched = now;
    
    return generalSettings;
  } catch (error) {
    console.error('Error fetching general settings:', error);
    return null;
  }
}

/**
 * Get shipping settings
 */
export async function getShippingSettings(forceRefresh = false): Promise<ShippingSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.shipping && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.shipping;
  }

  try {
    const settings = await getSettingGroup('shipping');
    const shippingSettings = settingsArrayToObject(settings) as ShippingSettings;
    
    settingsCache.shipping = shippingSettings;
    settingsCache.lastFetched = now;
    
    return shippingSettings;
  } catch (error) {
    console.error('Error fetching shipping settings:', error);
    return null;
  }
}

/**
 * Get coupon/discount settings
 */
export async function getCouponSettings(forceRefresh = false): Promise<CouponSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.coupons && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.coupons;
  }

  try {
    const settings = await getSettingGroup('general');
    const couponSettings = settingsArrayToObject(settings) as CouponSettings;
    
    settingsCache.coupons = couponSettings;
    settingsCache.lastFetched = now;
    
    return couponSettings;
  } catch (error) {
    console.error('Error fetching coupon settings:', error);
    return null;
  }
}

/**
 * Get product settings
 */
export async function getProductSettings(forceRefresh = false): Promise<ProductSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.products && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.products;
  }

  try {
    const settings = await getSettingGroup('products');
    const productSettings = settingsArrayToObject(settings) as ProductSettings;
    
    settingsCache.products = productSettings;
    settingsCache.lastFetched = now;
    
    return productSettings;
  } catch (error) {
    console.error('Error fetching product settings:', error);
    return null;
  }
}

/**
 * Get account settings
 */
export async function getAccountSettings(forceRefresh = false): Promise<AccountSettings | null> {
  const now = Date.now();
  
  if (!forceRefresh && settingsCache.account && settingsCache.lastFetched && 
      (now - settingsCache.lastFetched < CACHE_DURATION)) {
    return settingsCache.account;
  }

  try {
    const settings = await getSettingGroup('account');
    const accountSettings = settingsArrayToObject(settings) as AccountSettings;
    
    settingsCache.account = accountSettings;
    settingsCache.lastFetched = now;
    
    return accountSettings;
  } catch (error) {
    console.error('Error fetching account settings:', error);
    return null;
  }
}

/**
 * Check if taxes are enabled in WooCommerce
 */
export async function areTaxesEnabled(): Promise<boolean> {
  const taxSettings = await getTaxSettings();
  return taxSettings?.woocommerce_calc_taxes === 'yes';
}

/**
 * Check if coupons/discounts are enabled
 */
export async function areCouponsEnabled(): Promise<boolean> {
  const couponSettings = await getCouponSettings();
  return couponSettings?.woocommerce_enable_coupons === 'yes';
}

/**
 * Get store currency
 */
export async function getStoreCurrency(): Promise<string> {
  const generalSettings = await getGeneralSettings();
  return generalSettings?.woocommerce_currency || 'NGN';
}

/**
 * Get store currency symbol position
 */
export async function getCurrencyPosition(): Promise<'left' | 'right' | 'left_space' | 'right_space'> {
  const generalSettings = await getGeneralSettings();
  const pos = generalSettings?.woocommerce_currency_pos || 'left';
  return pos as 'left' | 'right' | 'left_space' | 'right_space';
}

/**
 * Get decimal and thousand separators
 */
export async function getNumberFormatting(): Promise<{
  decimalSeparator: string;
  thousandSeparator: string;
  decimals: number;
}> {
  const generalSettings = await getGeneralSettings();
  return {
    decimalSeparator: generalSettings?.woocommerce_price_decimal_sep || '.',
    thousandSeparator: generalSettings?.woocommerce_price_thousand_sep || ',',
    decimals: parseInt(generalSettings?.woocommerce_price_num_decimals || '2'),
  };
}

/**
 * Clear settings cache (useful for testing or when settings are updated)
 */
export function clearSettingsCache() {
  settingsCache = {};
}