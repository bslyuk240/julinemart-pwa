import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

const { getCampaignBySlugMock } = vi.hoisted(() => ({ getCampaignBySlugMock: vi.fn() }));
vi.mock('@/lib/campaigns/get-campaign', () => ({ getCampaignBySlug: getCampaignBySlugMock }));

const { resolveCampaignReviewsMock } = vi.hoisted(() => ({ resolveCampaignReviewsMock: vi.fn() }));
vi.mock('@/lib/campaigns/reviews', () => ({ resolveCampaignReviews: resolveCampaignReviewsMock }));

import { GET } from './route';

const fakeCampaign = { id: 'c1', slug: 'kitchen-world-summer' } as unknown as Campaign;

beforeEach(() => {
  getCampaignBySlugMock.mockReset();
  resolveCampaignReviewsMock.mockReset();
});

describe('GET /api/campaigns/[slug]/reviews', () => {
  it('404s without calling the review resolver when the campaign does not resolve', async () => {
    getCampaignBySlugMock.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/campaigns/x/reviews'), {
      params: Promise.resolve({ slug: 'x' }),
    });
    expect(response.status).toBe(404);
    expect(resolveCampaignReviewsMock).not.toHaveBeenCalled();
  });

  it('returns an empty-but-valid shape when there are no matching reviews (never breaks the page)', async () => {
    getCampaignBySlugMock.mockResolvedValue(fakeCampaign);
    resolveCampaignReviewsMock.mockResolvedValue({ reviews: [], scopeUsed: 'mixed' });
    const response = await GET(new Request('http://localhost/api/campaigns/kitchen-world-summer/reviews'), {
      params: Promise.resolve({ slug: 'kitchen-world-summer' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.reviews).toEqual([]);
    expect(body.meta.count).toBe(0);
  });
});
