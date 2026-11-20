import type { CampaignOfferConfig } from '@/types/campaigns';

function normalise(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9%₦]+/g, ' ').trim();
}

/** Per-product line such as "20% off": only for percentage codes, which apply evenly to each item. */
export function perProductCodeLabel(offer?: CampaignOfferConfig): string | null {
  if (!offer?.couponCode || offer.discountType !== 'percentage' || !offer.discountValue) return null;
  return `${offer.discountValue}% off`;
}

/** "20% off", "₦5,000 off", "Free delivery", or null when the offer has no discount fields. */
export function describeOfferDiscount(offer?: CampaignOfferConfig): string | null {
  if (!offer) return null;
  if (offer.discountType === 'percentage' && offer.discountValue) return `${offer.discountValue}% off`;
  if (offer.discountType === 'fixed_amount' && offer.discountValue) {
    return `₦${offer.discountValue.toLocaleString('en-NG')} off`;
  }
  // discountType 'free' is ambiguous (free item vs 100% off), so only freeDelivery counts.
  if (offer.freeDelivery) return 'Free delivery';
  return null;
}

/**
 * True when the display text is the campaign title, or most of it (at least
 * 60% of its words, in order). A short real headline like "Save 20%" is kept.
 */
function repeatsCampaignTitle(display: string, title: string): boolean {
  const d = normalise(display);
  const t = normalise(title);
  if (!d || !t) return false;
  if (d === t) return true;
  const dWords = d.split(' ');
  const tWords = t.split(' ');
  return (` ${t} `).includes(` ${d} `) && dWords.length / tWords.length >= 0.6;
}

/**
 * The headline for the offer ticket. Admins often paste the campaign title
 * into the offer's display text, which made the page repeat the same title
 * four times; when that happens, describe the discount instead.
 */
export function offerHeadline(offer: CampaignOfferConfig | undefined, campaignTitle: string): string {
  const display = offer?.displayText?.trim();
  const repeatsTitle = Boolean(display) && repeatsCampaignTitle(display!, campaignTitle);
  if (display && !repeatsTitle) return display;
  const discount = describeOfferDiscount(offer);
  if (discount) return discount === 'Free delivery' ? 'Free delivery on your order' : `${discount} your order`;
  return display || 'Special offer on this campaign';
}

/** "Min. spend ₦10,000 · New customers only · One use per customer · Ends 30 Nov" */
export function offerConditions(
  offer: CampaignOfferConfig | undefined,
  endDate?: string,
  usesPerCustomer?: number,
): string {
  if (!offer) return '';
  const parts: string[] = [];
  if (offer.minimumSpend) parts.push(`Min. spend ₦${offer.minimumSpend.toLocaleString('en-NG')}`);
  if (offer.newCustomersOnly) parts.push('New customers only');
  if (usesPerCustomer === 1) parts.push('One use per customer');
  else if (usesPerCustomer && usesPerCustomer > 1) parts.push(`${usesPerCustomer} uses per customer`);
  // Whichever ends first: the code stops working, or the campaign page goes offline.
  const endTimes = [offer.expirationDate, endDate]
    .map((d) => (d ? new Date(d).getTime() : NaN))
    .filter((t) => Number.isFinite(t));
  if (endTimes.length) {
    const date = new Date(Math.min(...endTimes));
    parts.push(
      `Ends ${date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })}`
    );
  }
  return parts.join(' · ');
}
