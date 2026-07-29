import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

function chainable(result: { data: unknown; error: unknown }) {
  const proxy: Record<string, unknown> = {};
  const self = () => proxy;
  proxy.select = self;
  proxy.eq = self;
  proxy.maybeSingle = () => Promise.resolve(result);
  return proxy;
}

const { supabaseFromMock } = vi.hoisted(() => ({ supabaseFromMock: vi.fn() }));
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({ from: supabaseFromMock }),
}));

const { resolveCampaignProductsMock } = vi.hoisted(() => ({ resolveCampaignProductsMock: vi.fn() }));
vi.mock('./products', () => ({ resolveCampaignProducts: resolveCampaignProductsMock }));

import { validateCampaign } from './validator';

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'camp-1',
    slug: 'test-campaign',
    internalName: 'Test',
    publicTitle: 'Test',
    status: 'active',
    targetType: 'general',
    sectionLayout: [],
    heroConfig: { headline: '', subtitle: '', ctaLabel: 'Shop Now' },
    productSelectionRules: { source: 'automatic' },
    reviewRules: { scope: 'mixed' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Campaign;
}

beforeEach(() => {
  supabaseFromMock.mockReset();
  resolveCampaignProductsMock.mockReset();
  resolveCampaignProductsMock.mockResolvedValue({ products: [{ id: 1 }], total: 1, source: 'automatic' });
});

describe('validateCampaign', () => {
  it('flags end date before start date as an error', async () => {
    const campaign = makeCampaign({
      startDate: '2026-08-31T00:00:00.000Z',
      endDate: '2026-06-01T00:00:00.000Z',
    });
    const result = await validateCampaign(campaign);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('End date must be after start date.');
  });

  it('warns (not errors) when no products currently match the rules', async () => {
    resolveCampaignProductsMock.mockResolvedValue({ products: [], total: 0, source: 'automatic' });
    const campaign = makeCampaign();
    const result = await validateCampaign(campaign);
    expect(result.valid).toBe(true); // a warning, not a hard error
    expect(result.warnings.some((w) => w.includes('No products'))).toBe(true);
  });

  it('warns when the linked voucher no longer exists', async () => {
    supabaseFromMock.mockImplementation(() => chainable({ data: null, error: null }));
    const campaign = makeCampaign({ offerConfig: { voucherId: '11111111-1111-1111-1111-111111111111' } });
    const result = await validateCampaign(campaign);
    expect(result.warnings.some((w) => w.includes('no longer exists'))).toBe(true);
  });

  it('warns when the linked voucher has expired', async () => {
    supabaseFromMock.mockImplementation(() =>
      chainable({
        data: {
          status: 'active',
          valid_from: '2020-01-01T00:00:00.000Z',
          valid_until: '2020-02-01T00:00:00.000Z',
          max_uses: 100,
          current_uses: 0,
        },
        error: null,
      })
    );
    const campaign = makeCampaign({ offerConfig: { voucherId: '11111111-1111-1111-1111-111111111111' } });
    const result = await validateCampaign(campaign);
    expect(result.warnings.some((w) => w.includes('expired'))).toBe(true);
  });

  it('is valid with no warnings when everything checks out', async () => {
    supabaseFromMock.mockImplementation(() =>
      chainable({
        data: { status: 'active', valid_from: null, valid_until: null, max_uses: 100, current_uses: 0 },
        error: null,
      })
    );
    const campaign = makeCampaign({ offerConfig: { voucherId: '11111111-1111-1111-1111-111111111111' } });
    const result = await validateCampaign(campaign);
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });
});
