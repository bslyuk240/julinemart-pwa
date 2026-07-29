import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

const { getCampaignBySlugMock } = vi.hoisted(() => ({ getCampaignBySlugMock: vi.fn() }));
vi.mock('@/lib/campaigns/get-campaign', () => ({ getCampaignBySlug: getCampaignBySlugMock }));

const { resolveCampaignProductsMock } = vi.hoisted(() => ({ resolveCampaignProductsMock: vi.fn() }));
vi.mock('@/lib/campaigns/products', () => ({ resolveCampaignProducts: resolveCampaignProductsMock }));

import { GET } from './route';

const fakeCampaign = { id: 'c1', slug: 'kitchen-world-summer' } as unknown as Campaign;

beforeEach(() => {
  getCampaignBySlugMock.mockReset();
  resolveCampaignProductsMock.mockReset();
});

describe('GET /api/campaigns/[slug]/products', () => {
  it('404s without calling the product resolver when the campaign does not resolve', async () => {
    getCampaignBySlugMock.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/campaigns/x/products'), {
      params: Promise.resolve({ slug: 'x' }),
    });
    expect(response.status).toBe(404);
    expect(resolveCampaignProductsMock).not.toHaveBeenCalled();
  });

  it('returns products and meta for an active campaign', async () => {
    getCampaignBySlugMock.mockResolvedValue(fakeCampaign);
    resolveCampaignProductsMock.mockResolvedValue({ products: [{ id: 1 }], total: 1, source: 'automatic' });
    const response = await GET(new Request('http://localhost/api/campaigns/kitchen-world-summer/products'), {
      params: Promise.resolve({ slug: 'kitchen-world-summer' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.products).toHaveLength(1);
    expect(body.meta.source).toBe('automatic');
  });
});
