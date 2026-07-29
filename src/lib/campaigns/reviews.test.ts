import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

interface FakeTableResult {
  data: unknown[] | null;
  error: unknown;
}

function chainable(result: FakeTableResult) {
  const proxy: Record<string, unknown> = {};
  const self = () => proxy;
  proxy.select = self;
  proxy.eq = self;
  proxy.in = self;
  proxy.order = self;
  proxy.limit = self;
  // Supabase query builders are thenable — `await builder` resolves this way
  // regardless of which chain method was called last.
  proxy.then = (resolve: (value: FakeTableResult) => void) => resolve(result);
  return proxy;
}

const { supabaseFromMock } = vi.hoisted(() => ({ supabaseFromMock: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({ from: supabaseFromMock }),
}));

const { resolveCampaignProductsMock } = vi.hoisted(() => ({ resolveCampaignProductsMock: vi.fn() }));
vi.mock('./products', () => ({ resolveCampaignProducts: resolveCampaignProductsMock }));

import { resolveCampaignReviews } from './reviews';

function makeCampaign(id: string, reviewRules: Campaign['reviewRules'], extra: Partial<Campaign> = {}): Campaign {
  return {
    id,
    slug: `campaign-${id}`,
    internalName: 'Test',
    publicTitle: 'Test',
    status: 'active',
    targetType: 'vendor',
    sectionLayout: [],
    heroConfig: { headline: '', subtitle: '', ctaLabel: 'Shop Now' },
    productSelectionRules: { source: 'automatic' },
    reviewRules,
    ...extra,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Campaign;
}

function makeReviewRow(overrides: Record<string, unknown> = {}) {
  return {
    id: `rev-${Math.random().toString(36).slice(2)}`,
    product_id: null,
    woo_product_id: 1,
    vendor_id: null,
    reviewer_name: 'Test Reviewer',
    rating: 5,
    body: 'Great product',
    status: 'approved',
    verified_purchase: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  supabaseFromMock.mockReset();
  resolveCampaignProductsMock.mockReset();
  resolveCampaignProductsMock.mockResolvedValue({ products: [], total: 0, source: 'automatic' });
});

describe('resolveCampaignReviews', () => {
  // Test Plan §2.3 edge case: "Review array empty (checks fallback rules
  // criteria)" — an empty result set must resolve cleanly, not throw.
  it('returns an empty list without throwing when nothing matches', async () => {
    supabaseFromMock.mockImplementation(() => chainable({ data: [], error: null }));
    const campaign = makeCampaign('empty', { scope: 'vendor', maxReviews: 5 });
    const result = await resolveCampaignReviews(campaign);
    expect(result.reviews).toEqual([]);
  });

  // Test Plan §2.3 edge case: "Exclusion arrays contain strings ... mismatches
  // with IDs" — an exclusion list with an id that doesn't exist in the result
  // set must not crash, and must not accidentally exclude anything real.
  it('ignores exclusion ids that do not match any review', async () => {
    const keptReview = makeReviewRow({ id: 'rev-keep' });
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'campaign_manual_exclusions') return chainable({ data: [{ entity_id: 'rev-does-not-exist' }], error: null });
      if (table === 'product_reviews') return chainable({ data: [keptReview], error: null });
      return chainable({ data: [], error: null });
    });
    const campaign = makeCampaign('exclude-mismatch', { scope: 'vendor', maxReviews: 5 }, { vendorOverride: { vendorId: 'v1', name: 'Vendor' } });
    const result = await resolveCampaignReviews(campaign);
    expect(result.reviews.map((r) => r.id)).toEqual(['rev-keep']);
  });

  it('actually excludes a review whose id is in the manual exclusion list', async () => {
    const excluded = makeReviewRow({ id: 'rev-excluded' });
    const kept = makeReviewRow({ id: 'rev-kept' });
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'campaign_manual_exclusions') return chainable({ data: [{ entity_id: 'rev-excluded' }], error: null });
      if (table === 'product_reviews') return chainable({ data: [excluded, kept], error: null });
      return chainable({ data: [], error: null });
    });
    const campaign = makeCampaign('exclude-real', { scope: 'vendor', maxReviews: 5 }, { vendorOverride: { vendorId: 'v1', name: 'Vendor' } });
    const result = await resolveCampaignReviews(campaign);
    expect(result.reviews.map((r) => r.id)).toEqual(['rev-kept']);
  });

  // Test Plan §2.3 edge case: "Multiple reviews exceeding the configuration
  // limit (assert exact truncation is occurred, prioritizing highest scores)."
  it('truncates to maxReviews and sorts by highest_rated when configured', async () => {
    const rows = [
      makeReviewRow({ id: 'r1', rating: 3 }),
      makeReviewRow({ id: 'r2', rating: 5 }),
      makeReviewRow({ id: 'r3', rating: 4 }),
    ];
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'campaign_manual_exclusions') return chainable({ data: [], error: null });
      if (table === 'product_reviews') return chainable({ data: rows, error: null });
      return chainable({ data: [], error: null });
    });
    const campaign = makeCampaign(
      'sort-truncate',
      { scope: 'vendor', maxReviews: 2, sort: 'highest_rated' },
      { vendorOverride: { vendorId: 'v1', name: 'Vendor' } }
    );
    const result = await resolveCampaignReviews(campaign);
    expect(result.reviews).toHaveLength(2);
    expect(result.reviews.map((r) => r.rating)).toEqual([5, 4]);
  });

  it('tags every review with an attribution label matching its source tier', async () => {
    const row = makeReviewRow({ id: 'r1' });
    supabaseFromMock.mockImplementation((table: string) => {
      if (table === 'campaign_manual_exclusions') return chainable({ data: [], error: null });
      if (table === 'product_reviews') return chainable({ data: [row], error: null });
      return chainable({ data: [], error: null });
    });
    const campaign = makeCampaign(
      'attribution',
      { scope: 'vendor', maxReviews: 5 },
      { vendorOverride: { vendorId: 'v1', name: 'Kitchen World' } }
    );
    const result = await resolveCampaignReviews(campaign);
    expect(result.reviews[0].attribution.matchedVia).toBe('vendor');
    expect(result.reviews[0].attribution.label).toContain('Kitchen World');
  });
});
