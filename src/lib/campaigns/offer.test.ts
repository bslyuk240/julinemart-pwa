import { beforeEach, describe, expect, it, vi } from 'vitest';

const { voucherRow } = vi.hoisted(() => ({ voucherRow: { current: null as Record<string, unknown> | null } }));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: voucherRow.current, error: null }),
        }),
      }),
    }),
  }),
}));

import { resolveCampaignOffer } from './offer';

const OFFER = { voucherId: 'v1', couponCode: 'BLACKFRIDAY20', displayText: 'Black Friday' };

function voucher(extra: Record<string, unknown> = {}) {
  return {
    status: 'active',
    discount_type: 'percentage',
    discount_value: 20,
    shipping_discount_type: 'none',
    valid_until: new Date(Date.now() + 86400000).toISOString(),
    product_ids: null,
    product_skus: null,
    vendor_ids: null,
    category_ids: null,
    gift_box_skus: null,
    gift_occasion_slugs: null,
    gift_recipient_slugs: null,
    ...extra,
  };
}

describe('resolveCampaignOffer', () => {
  beforeEach(() => {
    voucherRow.current = null;
  });

  it('fills the discount from an unrestricted voucher', async () => {
    voucherRow.current = voucher();
    const { offer, appliesToAll } = await resolveCampaignOffer(OFFER);
    expect(offer).toMatchObject({ discountType: 'percentage', discountValue: 20 });
    expect(appliesToAll).toBe(true);
  });

  it('does not claim every product when the voucher is limited', async () => {
    voucherRow.current = voucher({ product_ids: ['p1'] });
    const { offer, appliesToAll } = await resolveCampaignOffer(OFFER);
    expect(offer?.discountType).toBe('percentage');
    expect(appliesToAll).toBe(false);
  });

  it('does not claim every product when there is a minimum spend', async () => {
    voucherRow.current = voucher();
    const { appliesToAll } = await resolveCampaignOffer({ ...OFFER, minimumSpend: 10000 });
    expect(appliesToAll).toBe(false);
  });

  it('ignores the ambiguous "free" discount type', async () => {
    voucherRow.current = voucher({ discount_type: 'free', discount_value: null });
    const { offer } = await resolveCampaignOffer(OFFER);
    expect(offer?.discountType).toBeUndefined();
  });

  it('leaves the offer alone when the voucher is expired or inactive', async () => {
    voucherRow.current = voucher({ valid_until: '2020-01-01T00:00:00Z' });
    expect((await resolveCampaignOffer(OFFER)).offer).toEqual(OFFER);
    voucherRow.current = voucher({ status: 'cancelled' });
    expect((await resolveCampaignOffer(OFFER)).offer).toEqual(OFFER);
  });

  it('leaves the offer alone when the voucher is missing', async () => {
    expect(await resolveCampaignOffer(OFFER)).toEqual({ offer: OFFER, appliesToAll: false });
  });
});
