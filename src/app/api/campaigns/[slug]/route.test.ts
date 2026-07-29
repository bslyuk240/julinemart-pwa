import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Campaign } from '@/types/campaigns';

const { getCampaignBySlugMock } = vi.hoisted(() => ({ getCampaignBySlugMock: vi.fn() }));
vi.mock('@/lib/campaigns/get-campaign', () => ({ getCampaignBySlug: getCampaignBySlugMock }));

import { GET } from './route';

const fakeCampaign = { id: 'c1', slug: 'kitchen-world-summer', publicTitle: 'Kitchen World Summer' } as unknown as Campaign;

beforeEach(() => {
  getCampaignBySlugMock.mockReset();
});

describe('GET /api/campaigns/[slug]', () => {
  // Test Plan §4: draft/inactive campaigns must 404, masking their existence.
  it('returns 404 when the campaign does not resolve (missing, draft, or expired)', async () => {
    getCampaignBySlugMock.mockResolvedValue(null);
    const response = await GET(new Request('http://localhost/api/campaigns/does-not-exist'), {
      params: Promise.resolve({ slug: 'does-not-exist' }),
    });
    expect(response.status).toBe(404);
  });

  it('returns 200 with the campaign payload when active', async () => {
    getCampaignBySlugMock.mockResolvedValue(fakeCampaign);
    const response = await GET(new Request('http://localhost/api/campaigns/kitchen-world-summer'), {
      params: Promise.resolve({ slug: 'kitchen-world-summer' }),
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.campaign.slug).toBe('kitchen-world-summer');
  });

  it('always requires an active campaign (no accidental preview bypass)', async () => {
    await GET(new Request('http://localhost/api/campaigns/kitchen-world-summer'), {
      params: Promise.resolve({ slug: 'kitchen-world-summer' }),
    });
    expect(getCampaignBySlugMock).toHaveBeenCalledWith('kitchen-world-summer', { requireActive: true });
  });
});
