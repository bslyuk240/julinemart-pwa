import { describe, expect, it } from 'vitest';
import { offerConditions, offerHeadline, perProductCodeLabel } from './offer-copy';

const TITLE = 'JulineMart Black Friday 2026 – Gift Early, Save 20%';

describe('offerHeadline', () => {
  it('describes the discount when the display text repeats the campaign title', () => {
    expect(
      offerHeadline({ displayText: TITLE, discountType: 'percentage', discountValue: 20 }, TITLE)
    ).toBe('20% off your order');
  });

  it('keeps display text that says something new', () => {
    expect(offerHeadline({ displayText: 'Extra 20% on gifts', discountType: 'percentage', discountValue: 20 }, TITLE)).toBe(
      'Extra 20% on gifts'
    );
  });

  it('falls back to the display text when there is no discount to describe', () => {
    expect(offerHeadline({ displayText: TITLE }, TITLE)).toBe(TITLE);
  });
});

describe('offerConditions', () => {
  it('joins spend, audience and end date', () => {
    expect(
      offerConditions({ minimumSpend: 10000, newCustomersOnly: true }, '2026-11-30T22:59:00+00:00')
    ).toBe('Min. spend ₦10,000 · New customers only · Ends 30 Nov');
  });

  it('uses whichever ends first, voucher or campaign', () => {
    expect(offerConditions({ expirationDate: '2026-12-01T10:00:00Z' }, '2026-11-30T22:59:00+00:00')).toBe('Ends 30 Nov');
  });
});

describe('offerHeadline edge cases', () => {
  it('keeps a short real headline that happens to share words with the title', () => {
    expect(offerHeadline({ displayText: 'Save 20%', discountType: 'percentage', discountValue: 20 }, TITLE)).toBe('Save 20%');
  });

  it('describes fixed-amount and free-delivery offers', () => {
    expect(offerHeadline({ discountType: 'fixed_amount', discountValue: 5000 }, TITLE)).toBe('₦5,000 off your order');
    expect(offerHeadline({ freeDelivery: true }, TITLE)).toBe('Free delivery on your order');
  });

  it('never calls the ambiguous "free" type free delivery', () => {
    expect(offerHeadline({ discountType: 'free' }, TITLE)).toBe('Special offer on this campaign');
  });
});

describe('perProductCodeLabel', () => {
  it('only labels percentage codes', () => {
    expect(perProductCodeLabel({ couponCode: 'X', discountType: 'percentage', discountValue: 20 })).toBe('20% off');
    expect(perProductCodeLabel({ couponCode: 'X', discountType: 'fixed_amount', discountValue: 5000 })).toBeNull();
    expect(perProductCodeLabel({ couponCode: 'X', freeDelivery: true })).toBeNull();
    expect(perProductCodeLabel({ discountType: 'percentage', discountValue: 20 })).toBeNull();
  });
});
