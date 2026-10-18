import type { Product } from '@/types/product';
import { parseMoney } from '@/lib/utils/parse-money';

// Filters for the mobile listing sheet. The catalog API ignores price/stock
// params today, so these run client-side over the products already loaded
// (the listing pulls a few extra pages while a filter is on).

export type ListingFilters = {
  inStockOnly: boolean;
  minPrice: number | null;
  maxPrice: number | null;
  /** Seller (store) names; empty means every seller. */
  sellers: string[];
};

export const EMPTY_LISTING_FILTERS: ListingFilters = {
  inStockOnly: false,
  minPrice: null,
  maxPrice: null,
  sellers: [],
};

export type PricePreset = { label: string; min: number | null; max: number | null };

export const PRICE_PRESETS: PricePreset[] = [
  { label: 'Under ₦10,000', min: null, max: 10000 },
  { label: 'Under ₦20,000', min: null, max: 20000 },
  { label: '₦20,000 – ₦50,000', min: 20000, max: 50000 },
  { label: 'Over ₦50,000', min: 50000, max: null },
];

export function productPrice(product: Product): number {
  return parseMoney(product.sale_price, product.price, product.min_price);
}

export function productSeller(product: Product): string {
  return (product.store?.shop_name || product.store?.name || '').trim();
}

export function applyListingFilters(products: Product[], filters: ListingFilters): Product[] {
  if (countActiveFilters(filters) === 0) return products;
  const sellers = new Set(filters.sellers);
  return products.filter((product) => {
    if (filters.inStockOnly && product.stock_status === 'outofstock') return false;
    const price = productPrice(product);
    if (filters.minPrice !== null && price < filters.minPrice) return false;
    if (filters.maxPrice !== null && price > filters.maxPrice) return false;
    if (sellers.size > 0 && !sellers.has(productSeller(product))) return false;
    return true;
  });
}

/** Number of filter groups in use (price counts once), for the "Filters · n" chip. */
export function countActiveFilters(filters: ListingFilters): number {
  return (
    (filters.inStockOnly ? 1 : 0) +
    (filters.minPrice !== null || filters.maxPrice !== null ? 1 : 0) +
    (filters.sellers.length > 0 ? 1 : 0)
  );
}

export function matchesPreset(filters: ListingFilters, preset: PricePreset): boolean {
  return filters.minPrice === preset.min && filters.maxPrice === preset.max;
}

/** Distinct sellers among the loaded products, most products first. */
export function sellerOptions(products: Product[]): string[] {
  const counts = new Map<string, number>();
  products.forEach((product) => {
    const seller = productSeller(product);
    if (seller) counts.set(seller, (counts.get(seller) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name);
}
