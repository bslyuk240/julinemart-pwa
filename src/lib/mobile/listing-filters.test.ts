import { describe, expect, it } from 'vitest';
import type { Product } from '@/types/product';
import {
  EMPTY_LISTING_FILTERS,
  PRICE_PRESETS,
  applyListingFilters,
  countActiveFilters,
  matchesPreset,
  sellerOptions,
} from './listing-filters';
import { withRecentSearch } from './recent-searches';

const product = (id: number, price: string, seller: string, stock: 'instock' | 'outofstock' = 'instock') =>
  ({ id, price, sale_price: '', min_price: undefined, stock_status: stock, store: { shop_name: seller } }) as unknown as Product;

const catalog = [
  product(1, '5500', 'Vikuves Household'),
  product(2, '61000', 'Vikuves Household'),
  product(3, '14210.67', 'JulineMart Official Store', 'outofstock'),
  product(4, '20000', 'JulineMart Official Store'),
];

describe('applyListingFilters', () => {
  it('returns everything when no filter is set', () => {
    expect(applyListingFilters(catalog, EMPTY_LISTING_FILTERS)).toHaveLength(4);
  });

  it('filters by price range inclusively', () => {
    const under20k = applyListingFilters(catalog, { ...EMPTY_LISTING_FILTERS, maxPrice: 20000 });
    expect(under20k.map((p) => p.id)).toEqual([1, 3, 4]);
  });

  it('combines stock and seller filters', () => {
    const result = applyListingFilters(catalog, {
      ...EMPTY_LISTING_FILTERS,
      inStockOnly: true,
      sellers: ['JulineMart Official Store'],
    });
    expect(result.map((p) => p.id)).toEqual([4]);
  });
});

describe('withRecentSearch', () => {
  it('puts the newest first, de-duplicates case-insensitively and caps the list', () => {
    expect(withRecentSearch(['gift box', 'Solar fan'], ' solar  FAN ')).toEqual(['solar FAN', 'gift box']);
    expect(withRecentSearch(['a', 'b'], '   ')).toEqual(['a', 'b']);
    const many = Array.from({ length: 8 }, (_, i) => `term ${i}`);
    expect(withRecentSearch(many, 'new')).toHaveLength(8);
  });
});

describe('filter helpers', () => {
  it('counts price as one filter group', () => {
    expect(countActiveFilters({ ...EMPTY_LISTING_FILTERS, minPrice: 1, maxPrice: 2, inStockOnly: true })).toBe(2);
  });

  it('matches a preset only on exact bounds', () => {
    const under20k = PRICE_PRESETS[1];
    expect(matchesPreset({ ...EMPTY_LISTING_FILTERS, maxPrice: 20000 }, under20k)).toBe(true);
    expect(matchesPreset({ ...EMPTY_LISTING_FILTERS, minPrice: 0, maxPrice: 20000 }, under20k)).toBe(false);
  });

  it('lists sellers by product count', () => {
    expect(sellerOptions([...catalog, product(5, '1', 'Vikuves Household')])).toEqual([
      'Vikuves Household',
      'JulineMart Official Store',
    ]);
  });
});
