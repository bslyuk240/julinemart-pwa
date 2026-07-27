import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

// Mocks the Supabase query builder chain (`.from().select().eq().in()...`)
// used directly by products.ts now that it bypasses the JLO catalog function
// (confirmed broken — see the comment in products.ts) and queries the
// `products` table itself. `state.products` holds the raw rows a given test
// wants the "products" table to return; the builder is a thenable so
// `await query` in the implementation resolves it like the real client would.
interface MockState {
  products: Record<string, unknown>[];
  categoryMap: { product_id: string }[];
  vendor: { id: string } | null;
}

const state: MockState = { products: [], categoryMap: [], vendor: null };
const builders: Record<string, ReturnType<typeof makeBuilder>[]> = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBuilder(table: string): any {
  const filters: Record<string, unknown> = {};
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    }),
    in: vi.fn((col: string, val: unknown) => {
      filters[col] = val;
      return builder;
    }),
    not: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => ({ data: table === 'vendors' ? state.vendor : null })),
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
      const data =
        table === 'products' ? state.products : table === 'product_category_map' ? state.categoryMap : [];
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return builder;
}

const supabaseFromMock = vi.fn((table: string) => {
  const builder = makeBuilder(table);
  builders[table] = builders[table] ?? [];
  builders[table].push(builder);
  return builder;
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({ from: supabaseFromMock }),
}));

import { resolveCampaignProducts, resolveEffectiveProductRules } from './products';

function makeRow(overrides: Record<string, unknown> = {}) {
  const wooId = (overrides.woo_product_id as number) ?? 1;
  return {
    id: `row-uuid-${wooId}`,
    woo_product_id: wooId,
    name: 'Test Product',
    slug: 'test-product',
    sku: 'SKU-1',
    status: 'published',
    type: 'simple',
    regular_price: '1000',
    sale_price: null,
    average_rating: '4.5',
    rating_count: 10,
    stock_status: 'instock',
    images: [],
    category_map: [],
    ...overrides,
  };
}

function makeCampaign(id: string, productSelectionRules: Campaign['productSelectionRules']): Campaign {
  return {
    id,
    slug: `campaign-${id}`,
    internalName: 'Test',
    publicTitle: 'Test',
    status: 'active',
    targetType: 'general',
    sectionLayout: [],
    heroConfig: { headline: '', subtitle: '', ctaLabel: 'Shop Now' },
    productSelectionRules,
    reviewRules: { scope: 'mixed' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Campaign;
}

beforeEach(() => {
  state.products = [];
  state.categoryMap = [];
  state.vendor = null;
  supabaseFromMock.mockClear();
  Object.keys(builders).forEach((k) => delete builders[k]);
});

describe('resolveCampaignProducts', () => {
  // Test Plan §2.2 edge case: "No products matching the rule-set" —
  // assert an empty, non-throwing result rather than a crash.
  it('returns an empty list when the catalog has no matches', async () => {
    state.products = [];
    const campaign = makeCampaign('no-match', { source: 'automatic', maxProducts: 12 });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products).toEqual([]);
    expect(result.total).toBe(0);
  });

  // Test Plan §2.2 edge case: "Products missing specific structural values
  // (e.g., missing rating maps to default 0)" — a minimumRating filter must
  // not throw on a product with an empty/undefined average_rating.
  it('treats a missing average_rating as 0 when filtering by minimumRating', async () => {
    state.products = [
      makeRow({ woo_product_id: 1, average_rating: '' }),
      makeRow({ woo_product_id: 2, average_rating: '4.8' }),
    ];
    const campaign = makeCampaign('min-rating', { source: 'rules_based', minimumRating: 4, maxProducts: 12 });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products.map((p) => p.id)).toEqual([2]);
  });

  it('excludes SKUs listed in excludeSkus', async () => {
    state.products = [
      makeRow({ woo_product_id: 1, sku: 'BAD-SKU' }),
      makeRow({ woo_product_id: 2, sku: 'GOOD-SKU' }),
    ];
    const campaign = makeCampaign('exclude-sku', { source: 'automatic', excludeSkus: ['BAD-SKU'], maxProducts: 12 });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products.map((p) => p.id)).toEqual([2]);
  });

  // Test Plan §2.2 edge case: "Pinning systems containing identifiers that do
  // not exist within the available filtered product catalog" — a pinned id
  // with no matching product must not throw, and existing products must
  // still surface in their normal (unpinned) order.
  it('pins matching products to the front without erroring on unknown pinned ids', async () => {
    state.products = [
      makeRow({ woo_product_id: 1 }),
      makeRow({ woo_product_id: 2 }),
      makeRow({ woo_product_id: 3 }),
    ];
    const campaign = makeCampaign('pinned', {
      source: 'automatic',
      pinnedProductIds: [3, 999], // 999 doesn't exist in the catalog result
      maxProducts: 12,
    });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products.map((p) => p.id)).toEqual([3, 1, 2]);
  });

  it('caps the result at maxProducts', async () => {
    state.products = [makeRow({ woo_product_id: 1 }), makeRow({ woo_product_id: 2 }), makeRow({ woo_product_id: 3 })];
    const campaign = makeCampaign('max-cap', { source: 'automatic', maxProducts: 2 });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products).toHaveLength(2);
  });

  it('queries products directly by woo_product_id for manual selections instead of trusting an external filter', async () => {
    state.products = [makeRow({ woo_product_id: 42 })];
    const campaign = makeCampaign('manual', { source: 'manual', manualProductIds: ['42'], maxProducts: 12 });
    const result = await resolveCampaignProducts(campaign);
    expect(builders.products[0].in).toHaveBeenCalledWith('woo_product_id', [42]);
    expect(result.products.map((p) => p.id)).toEqual([42]);
  });

  it('resolves categoryIds to product ids via product_category_map before querying products', async () => {
    state.categoryMap = [{ product_id: 'row-uuid-7' }];
    state.products = [makeRow({ woo_product_id: 7, id: 'row-uuid-7' })];
    const campaign = makeCampaign('by-category', {
      source: 'rules_based',
      categoryIds: ['cat-uuid-1'],
      maxProducts: 12,
    });
    const result = await resolveCampaignProducts(campaign);
    expect(builders.product_category_map[0].eq).toHaveBeenCalledWith('category_id', 'cat-uuid-1');
    expect(builders.products[0].in).toHaveBeenCalledWith('id', ['row-uuid-7']);
    expect(result.products.map((p) => p.id)).toEqual([7]);
  });

  it('filters out non-discounted rows client-side when discountedOnly is set', async () => {
    state.products = [
      makeRow({ woo_product_id: 1, regular_price: '1000', sale_price: '800' }),
      makeRow({ woo_product_id: 2, regular_price: '1000', sale_price: null }),
    ];
    const campaign = makeCampaign('discounted', { source: 'automatic', discountedOnly: true, maxProducts: 12 });
    const result = await resolveCampaignProducts(campaign);
    expect(result.products.map((p) => p.id)).toEqual([1]);
  });

  it('inherits vendorId from campaign target when product rules omit it', async () => {
    state.vendor = { id: 'vendor-uuid-1' };
    state.products = [makeRow({ woo_product_id: 9, vendor_id: 'vendor-uuid-1' })];
    const campaign = {
      ...makeCampaign('vendor-inherit', { source: 'automatic', maxProducts: 12 }),
      targetType: 'vendor' as const,
      targetId: 'vendor-uuid-1',
    };
    const result = await resolveCampaignProducts(campaign);
    expect(builders.products[0].eq).toHaveBeenCalledWith('vendor_id', 'vendor-uuid-1');
    expect(result.products.map((p) => p.id)).toEqual([9]);
  });
});

describe('resolveEffectiveProductRules', () => {
  it('copies vendor target into vendorId', () => {
    const rules = resolveEffectiveProductRules({
      ...makeCampaign('v', { source: 'automatic' }),
      targetType: 'vendor',
      targetId: 'abc-vendor',
    });
    expect(rules.vendorId).toBe('abc-vendor');
    expect(rules.source).toBe('rules_based');
  });

  it('copies category target into categoryIds', () => {
    const rules = resolveEffectiveProductRules({
      ...makeCampaign('c', { source: 'automatic' }),
      targetType: 'category',
      targetId: 'cat-1',
    });
    expect(rules.categoryIds).toEqual(['cat-1']);
  });
});
