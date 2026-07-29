import { describe, it, expect } from 'vitest';
import {
  campaignCreateSchema,
  campaignAnalyticsEventSchema,
  campaignOfferConfigSchema,
  campaignQrVariantSchema,
} from './campaigns';

const validCampaign = {
  internalName: 'Kitchen Spotlight Promo Q3',
  publicTitle: 'Shop Kitchen Essentials with Kitchen World',
  slug: 'kitchen-world-summer',
  targetType: 'vendor' as const,
  heroConfig: { headline: 'Shop Kitchen Essentials', subtitle: 'Trusted products.', ctaLabel: 'Shop Now' },
  productSelectionRules: { source: 'automatic' as const },
  reviewRules: { scope: 'mixed' as const },
};

describe('campaignCreateSchema', () => {
  it('accepts a well-formed campaign', () => {
    const result = campaignCreateSchema.safeParse(validCampaign);
    expect(result.success).toBe(true);
  });

  // Test Plan §2.5: "End date prior to start date" must fail.
  it('rejects end date before start date', () => {
    const result = campaignCreateSchema.safeParse({
      ...validCampaign,
      startDate: '2026-08-31T00:00:00.000Z',
      endDate: '2026-06-01T00:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('accepts end date after start date', () => {
    const result = campaignCreateSchema.safeParse({
      ...validCampaign,
      startDate: '2026-06-01T00:00:00.000Z',
      endDate: '2026-08-31T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  // Test Plan §2.5: "Duplicate slug patterns or invalid slug URL characters."
  // Uniqueness is a DB constraint (campaigns.slug unique), not something Zod
  // can check — this only covers the format half.
  it.each(['Kitchen World', 'kitchen_world', 'kitchen--world', 'kitchen world!', 'ab'])(
    'rejects invalid slug %s',
    (slug) => {
      const result = campaignCreateSchema.safeParse({ ...validCampaign, slug });
      expect(result.success).toBe(false);
    }
  );

  it.each(['kitchen-world-summer', 'skincare-reveal', 'launch2026'])('accepts valid slug %s', (slug) => {
    const result = campaignCreateSchema.safeParse({ ...validCampaign, slug });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown section_type in sectionLayout (not a silent pass)', () => {
    const result = campaignCreateSchema.safeParse({
      ...validCampaign,
      sectionLayout: [{ sectionType: 'not_a_real_section', orderIndex: 0, isVisible: true, config: {} }],
    });
    expect(result.success).toBe(false);
  });
});

describe('campaignOfferConfigSchema', () => {
  // Test Plan §2.5: "Percentage adjustments configured above 100%."
  it('rejects a percentage discount over 100', () => {
    const result = campaignOfferConfigSchema.safeParse({ discountType: 'percentage', discountValue: 150 });
    expect(result.success).toBe(false);
  });

  it('accepts a percentage discount at exactly 100', () => {
    const result = campaignOfferConfigSchema.safeParse({ discountType: 'percentage', discountValue: 100 });
    expect(result.success).toBe(true);
  });

  it('allows a fixed_amount discount over 100 (no percentage ceiling applies)', () => {
    const result = campaignOfferConfigSchema.safeParse({ discountType: 'fixed_amount', discountValue: 5000 });
    expect(result.success).toBe(true);
  });
});

describe('campaignQrVariantSchema', () => {
  it('accepts a well-formed channel', () => {
    const result = campaignQrVariantSchema.safeParse({ channelName: 'Vendor Shop Poster', trackingSlug: 'vendor-shop-poster' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty channel name', () => {
    const result = campaignQrVariantSchema.safeParse({ channelName: '', trackingSlug: 'x-y' });
    expect(result.success).toBe(false);
  });
});

describe('campaignAnalyticsEventSchema', () => {
  const base = { campaignId: '11111111-1111-1111-1111-111111111111', visitorSessionId: 'sess-abc' };

  it('accepts a minimal valid event', () => {
    const result = campaignAnalyticsEventSchema.safeParse({ ...base, eventType: 'page_visit' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown eventType', () => {
    const result = campaignAnalyticsEventSchema.safeParse({ ...base, eventType: 'not_a_real_event' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID campaignId', () => {
    const result = campaignAnalyticsEventSchema.safeParse({
      campaignId: 'not-a-uuid',
      visitorSessionId: 'sess-abc',
      eventType: 'scan',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing visitorSessionId', () => {
    const result = campaignAnalyticsEventSchema.safeParse({
      campaignId: base.campaignId,
      eventType: 'scan',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative revenue', () => {
    const result = campaignAnalyticsEventSchema.safeParse({ ...base, eventType: 'checkout_complete', revenue: -500 });
    expect(result.success).toBe(false);
  });
});
