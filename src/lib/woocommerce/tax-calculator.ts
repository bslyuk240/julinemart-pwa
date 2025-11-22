import { getTaxSettings, areTaxesEnabled } from './settings';
import { wcApi, handleApiError } from './client';

/**
 * Tax Calculation Utilities
 * Dynamically calculate taxes based on WooCommerce settings
 */

export interface TaxRate {
  id: number;
  country: string;
  state: string;
  postcode: string;
  city: string;
  rate: string;
  name: string;
  priority: number;
  compound: boolean;
  shipping: boolean;
  order: number;
  class: string;
}

let taxRatesCache: TaxRate[] | null = null;
let lastFetched = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Get all tax rates from WooCommerce
 */
export async function getTaxRates(forceRefresh = false): Promise<TaxRate[]> {
  const now = Date.now();
  
  if (!forceRefresh && taxRatesCache && (now - lastFetched < CACHE_DURATION)) {
    return taxRatesCache;
  }

  try {
    const response = await wcApi.get('taxes', { per_page: 100 });
    taxRatesCache = response.data;
    lastFetched = now;
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Calculate tax for a given amount
 * @param amount - The amount to calculate tax for
 * @param taxClass - Tax class (default: 'standard')
 * @param country - Country code (default: 'NG' for Nigeria)
 * @param state - State/province code
 * @returns Tax amount
 */
export async function calculateTax(
  amount: number,
  taxClass: string = 'standard',
  country: string = 'NG',
  state: string = ''
): Promise<number> {
  // Check if taxes are enabled
  const taxesEnabled = await areTaxesEnabled();
  if (!taxesEnabled) {
    return 0;
  }

  try {
    // Get applicable tax rates
    const taxRates = await getTaxRates();
    
    // Filter rates by location and class
    const applicableRates = taxRates.filter(rate => {
      const matchesCountry = !rate.country || rate.country === '' || rate.country === country;
      const matchesState = !rate.state || rate.state === '' || rate.state === state;
      const matchesClass = !rate.class || rate.class === '' || rate.class === taxClass;
      
      return matchesCountry && matchesState && matchesClass;
    });

    // Calculate total tax
    let totalTax = 0;
    
    // Sort by priority
    applicableRates.sort((a, b) => a.priority - b.priority);
    
    for (const rate of applicableRates) {
      const ratePercent = parseFloat(rate.rate) / 100;
      
      if (rate.compound) {
        // Compound tax: calculated on amount + previous taxes
        totalTax += (amount + totalTax) * ratePercent;
      } else {
        // Simple tax: calculated on original amount
        totalTax += amount * ratePercent;
      }
    }

    return totalTax;
  } catch (error) {
    console.error('Error calculating tax:', error);
    return 0;
  }
}

/**
 * Calculate tax for multiple items
 */
export async function calculateCartTax(
  items: Array<{
    amount: number;
    taxClass?: string;
  }>,
  country: string = 'NG',
  state: string = ''
): Promise<number> {
  let totalTax = 0;
  
  for (const item of items) {
    const itemTax = await calculateTax(
      item.amount,
      item.taxClass || 'standard',
      country,
      state
    );
    totalTax += itemTax;
  }
  
  return totalTax;
}

/**
 * Get default tax rate for Nigeria (if no specific rates configured)
 * Nigeria standard VAT is 7.5%
 */
export async function getDefaultTaxRate(country: string = 'NG'): Promise<number> {
  const taxRates = await getTaxRates();
  
  // Find default rate for country
  const defaultRate = taxRates.find(rate => 
    (!rate.country || rate.country === country) &&
    (!rate.state || rate.state === '') &&
    (!rate.class || rate.class === 'standard')
  );
  
  if (defaultRate) {
    return parseFloat(defaultRate.rate) / 100;
  }
  
  // Fallback: Nigeria VAT
  if (country === 'NG') {
    return 0.075; // 7.5%
  }
  
  return 0;
}

/**
 * Format tax for display
 */
export function formatTaxAmount(tax: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(tax);
}

/**
 * Check if prices include tax
 */
export async function pricesIncludeTax(): Promise<boolean> {
  const taxSettings = await getTaxSettings();
  return taxSettings?.woocommerce_prices_include_tax === 'yes';
}

/**
 * Clear tax cache
 */
export function clearTaxCache() {
  taxRatesCache = null;
  lastFetched = 0;
}