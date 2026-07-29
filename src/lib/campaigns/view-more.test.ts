import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/types/campaigns';
import type { Product } from '@/types/product';
import { resolveCampaignViewMore, buildCampaignProductHref } from './view-more';

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
  it('links to vendor store when vendor-targeted', () => {
    const link = resolveCampaignViewMore(
      baseCampaign({
        targetType: 'vendor',
        targetId: '10',
        vendorOverride: { vendorId: 10, name: 'Kitchen World', storeLinkUrl: '/vendor/10' },
      }),
      []
    );
    expect(link).toEqual({
      href: '/vendor/10',
      label: 'View more from Kitchen World',
    });
  });

  it('links to category from product categories', () => {
    const products = [
      {
        categories: [{ id: 1, name: 'Kitchen', slug: 'kitchen' }],
      },
    ] as Product[];
    const link = resolveCampaignViewMore(
      baseCampaign({
        targetType: 'category',
        productSelectionRules: {
          source: 'rules_based',
          categoryIds: ['abc'],
        },
      }),
      products
    );
    expect(link).toEqual({
      href: '/category/kitchen',
      label: 'View more in Kitchen',
    });
  });
});

describe('buildCampaignProductHref', () => {
  it('includes return-to-campaign params', () => {
    expect(buildCampaignProductHref('juicer', 'first', 'First buyers', '20% off')).toBe(
      '/product/juicer?from_campaign=first&from_campaign_title=First+buyers&from_campaign_offer=20%25+off'
    );
  });
});
