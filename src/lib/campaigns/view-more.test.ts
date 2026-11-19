import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/types/campaigns';
import { resolveCampaignViewMore, campaignProductsHref, buildCampaignProductHref } from './view-more';

function baseCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    slug: 'first',
    internalName: 'Test',
    publicTitle: 'First buyers',
    status: 'active',
    targetType: 'general',
    sectionLayout: [],
    heroConfig: { headline: '', subtitle: '', ctaLabel: 'Shop' },
    productSelectionRules: { source: 'automatic' },
    reviewRules: { scope: 'mixed' },
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('resolveCampaignViewMore', () => {
  it('opens the campaign\'s own product list, whatever the campaign targets', () => {
    for (const targetType of ['vendor', 'category', 'multi_vendor', 'general'] as const) {
      const link = resolveCampaignViewMore(baseCampaign({ targetType, slug: 'black-friday' }), 12, 40);
      expect(link).toEqual({ href: '/campaigns/black-friday/products', label: 'View all 40 products' });
    }
  });

  it('is hidden when the preview already shows every product', () => {
    expect(resolveCampaignViewMore(baseCampaign(), 12, 12)).toBeNull();
    expect(resolveCampaignViewMore(baseCampaign(), 0, 0)).toBeNull();
  });
});

describe('campaignProductsHref', () => {
  it('links page 1 without a query and later pages with ?page=', () => {
    expect(campaignProductsHref('bf')).toBe('/campaigns/bf/products');
    expect(campaignProductsHref('bf', 1)).toBe('/campaigns/bf/products');
    expect(campaignProductsHref('bf', 3)).toBe('/campaigns/bf/products?page=3');
  });
});

describe('buildCampaignProductHref', () => {
  it('includes return-to-campaign params', () => {
    expect(buildCampaignProductHref('juicer', 'first', 'First buyers', '20% off')).toBe(
      '/product/juicer?from_campaign=first&from_campaign_title=First+buyers&from_campaign_offer=20%25+off'
    );
  });
});
