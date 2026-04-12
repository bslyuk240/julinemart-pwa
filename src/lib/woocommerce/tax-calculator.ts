import { getTaxSettings, areTaxesEnabled } from './settings';

/**
 * Tax Calculation Utilities
 * Static defaults after the Supabase migration.
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
const CACHE_DURATION = 10 * 60 * 1000;

export async function getTaxRates(forceRefresh = false): Promise<TaxRate[]> {
  const now = Date.now();
  if (!forceRefresh && taxRatesCache && now - lastFetched < CACHE_DURATION) {
    return taxRatesCache;
  }

  taxRatesCache = [];
  lastFetched = now;
  return taxRatesCache;
}

export async function calculateTax(
  amount: number,
  taxClass: string = 'standard',
  country: string = 'NG',
  state: string = ''
): Promise<number> {
  const taxesEnabled = await areTaxesEnabled();
  if (!taxesEnabled) {
    return 0;
  }

  const taxRates = await getTaxRates();
  const applicableRates = taxRates.filter((rate) => {
    const matchesCountry = !rate.country || rate.country === '' || rate.country === country;
    const matchesState = !rate.state || rate.state === '' || rate.state === state;
    const matchesClass = !rate.class || rate.class === '' || rate.class === taxClass;
    return matchesCountry && matchesState && matchesClass;
  });

  let totalTax = 0;
  applicableRates.sort((a, b) => a.priority - b.priority);

  for (const rate of applicableRates) {
    const ratePercent = parseFloat(rate.rate) / 100;
    totalTax += rate.compound ? (amount + totalTax) * ratePercent : amount * ratePercent;
  }

  return totalTax;
}

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
    const itemTax = await calculateTax(item.amount, item.taxClass || 'standard', country, state);
    totalTax += itemTax;
  }

  return totalTax;
}

export async function getDefaultTaxRate(country: string = 'NG'): Promise<number> {
  const taxRates = await getTaxRates();
  const defaultRate = taxRates.find(
    (rate) =>
      (!rate.country || rate.country === country) &&
      (!rate.state || rate.state === '') &&
      (!rate.class || rate.class === 'standard')
  );

  if (defaultRate) {
    return parseFloat(defaultRate.rate) / 100;
  }

  if (country === 'NG') {
    return 0.075;
  }

  return 0;
}

export { areTaxesEnabled } from './settings';

export function formatTaxAmount(tax: number, currency: string = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(tax);
}

export async function pricesIncludeTax(): Promise<boolean> {
  const taxSettings = await getTaxSettings();
  return taxSettings?.woocommerce_prices_include_tax === 'yes';
}

export function clearTaxCache() {
  taxRatesCache = null;
  lastFetched = 0;
}
