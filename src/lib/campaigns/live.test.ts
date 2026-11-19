import { describe, expect, it } from 'vitest';
import type { CampaignSummary } from '@/types/campaigns';
import { filterLiveCampaigns } from './live';

const NOW = Date.parse('2026-11-20T12:00:00Z');
const c = (id: string, endDate?: string) => ({ id, slug: id, publicTitle: id, endDate }) as CampaignSummary;

describe('filterLiveCampaigns', () => {
  it('drops ended campaigns and keeps open-ended or unparseable ones', () => {
    const result = filterLiveCampaigns(
      [c('ended', '2026-11-19T00:00:00Z'), c('live', '2026-11-30T00:00:00Z'), c('open'), c('bad', 'not a date')],
      NOW
    );
    expect(result.map((x) => x.id)).toEqual(['live', 'open', 'bad']);
  });
});
