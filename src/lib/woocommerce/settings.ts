/**
 * Store Settings
 * Static defaults used after the migration to Supabase as the source of truth.
 */

export interface TaxSettings {
  woocommerce_calc_taxes: string;
  woocommerce_prices_include_tax: string;
  woocommerce_tax_display_shop: string;
  woocommerce_tax_display_cart: string;
  woocommerce_tax_round_at_subtotal: string;
  woocommerce_tax_classes: string;
  woocommerce_tax_based_on: string;
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
  woocommerce_enable_coupons: string;
  woocommerce_calc_discounts_sequentially: string;
}

export interface ProductSettings {
  woocommerce_manage_stock: string;
  woocommerce_notify_low_stock: string;
  woocommerce_notify_no_stock: string;
  woocommerce_stock_format: string;
  woocommerce_enable_reviews: string;
  woocommerce_review_rating_required: string;
}

export interface AccountSettings {
  woocommerce_enable_guest_checkout: string;
  woocommerce_enable_signup_and_login_from_checkout: string;
  woocommerce_enable_myaccount_registration: string;
}

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  woocommerce_calc_taxes: 'no',
  woocommerce_prices_include_tax: 'no',
  woocommerce_tax_display_shop: 'excl',
  woocommerce_tax_display_cart: 'excl',
  woocommerce_tax_round_at_subtotal: 'no',
  woocommerce_tax_classes: '',
  woocommerce_tax_based_on: 'shipping',
};

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  woocommerce_default_country: 'NG',
  woocommerce_currency: 'NGN',
  woocommerce_currency_pos: 'left',
  woocommerce_price_thousand_sep: ',',
  woocommerce_price_decimal_sep: '.',
  woocommerce_price_num_decimals: '2',
};

const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  woocommerce_shipping_cost_requires_address: 'no',
  woocommerce_enable_shipping_calc: 'yes',
  woocommerce_shipping_debug_mode: 'no',
};

const DEFAULT_COUPON_SETTINGS: CouponSettings = {
  woocommerce_enable_coupons: 'yes',
  woocommerce_calc_discounts_sequentially: 'no',
};

const DEFAULT_PRODUCT_SETTINGS: ProductSettings = {
  woocommerce_manage_stock: 'yes',
  woocommerce_notify_low_stock: 'yes',
  woocommerce_notify_no_stock: 'yes',
  woocommerce_stock_format: 'no',
  woocommerce_enable_reviews: 'yes',
  woocommerce_review_rating_required: 'yes',
};

const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  woocommerce_enable_guest_checkout: 'yes',
  woocommerce_enable_signup_and_login_from_checkout: 'yes',
  woocommerce_enable_myaccount_registration: 'yes',
};

let settingsCache: {
  tax?: TaxSettings;
  general?: GeneralSettings;
  shipping?: ShippingSettings;
  coupons?: CouponSettings;
  products?: ProductSettings;
  account?: AccountSettings;
  lastFetched?: number;
} = {};

const CACHE_DURATION = 5 * 60 * 1000;

export async function getTaxSettings(forceRefresh = false): Promise<TaxSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.tax && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.tax;
  }

  settingsCache.tax = DEFAULT_TAX_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.tax;
}

export async function getGeneralSettings(forceRefresh = false): Promise<GeneralSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.general && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.general;
  }

  settingsCache.general = DEFAULT_GENERAL_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.general;
}

export async function getShippingSettings(forceRefresh = false): Promise<ShippingSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.shipping && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.shipping;
  }

  settingsCache.shipping = DEFAULT_SHIPPING_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.shipping;
}

export async function getCouponSettings(forceRefresh = false): Promise<CouponSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.coupons && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.coupons;
  }

  settingsCache.coupons = DEFAULT_COUPON_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.coupons;
}

export async function getProductSettings(forceRefresh = false): Promise<ProductSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.products && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.products;
  }

  settingsCache.products = DEFAULT_PRODUCT_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.products;
}

export async function getAccountSettings(forceRefresh = false): Promise<AccountSettings | null> {
  const now = Date.now();
  if (!forceRefresh && settingsCache.account && settingsCache.lastFetched && now - settingsCache.lastFetched < CACHE_DURATION) {
    return settingsCache.account;
  }

  settingsCache.account = DEFAULT_ACCOUNT_SETTINGS;
  settingsCache.lastFetched = now;
  return settingsCache.account;
}

export async function areTaxesEnabled(): Promise<boolean> {
  const taxSettings = await getTaxSettings();
  return taxSettings?.woocommerce_calc_taxes === 'yes';
}

export async function areCouponsEnabled(): Promise<boolean> {
  const couponSettings = await getCouponSettings();
  return couponSettings?.woocommerce_enable_coupons === 'yes';
}

export async function getStoreCurrency(): Promise<string> {
  const generalSettings = await getGeneralSettings();
  return generalSettings?.woocommerce_currency || 'NGN';
}

export async function getCurrencyPosition(): Promise<'left' | 'right' | 'left_space' | 'right_space'> {
  const generalSettings = await getGeneralSettings();
  const pos = generalSettings?.woocommerce_currency_pos || 'left';
  return pos as 'left' | 'right' | 'left_space' | 'right_space';
}

export async function getNumberFormatting(): Promise<{
  decimalSeparator: string;
  thousandSeparator: string;
  decimals: number;
}> {
  const generalSettings = await getGeneralSettings();
  return {
    decimalSeparator: generalSettings?.woocommerce_price_decimal_sep || '.',
    thousandSeparator: generalSettings?.woocommerce_price_thousand_sep || ',',
    decimals: parseInt(generalSettings?.woocommerce_price_num_decimals || '2', 10),
  };
}

export function clearSettingsCache() {
  settingsCache = {};
}
