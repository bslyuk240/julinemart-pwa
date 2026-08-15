import type { GiftBox } from '@/types/gifts';

export type GiftOccasionSlug =
  | 'birthday'
  | 'romantic'
  | 'mothers-day'
  | 'fathers-day'
  | 'wedding'
  | 'thank-you'
  | 'congratulations'
  | 'new-baby';

export type GiftRecipientSlug = 'her' | 'him' | 'mum' | 'dad' | 'friend' | 'family' | 'colleague' | 'kids';

export type GiftBudgetSlug = 'under-10k' | 'under-20k' | 'under-50k' | 'premium';

export const GIFT_OCCASIONS: { slug: GiftOccasionSlug; label: string; description: string }[] = [
  { slug: 'birthday', label: 'Birthday', description: 'Celebrate their day with a curated JulineMart gift box.' },
  { slug: 'romantic', label: 'Romantic', description: 'Thoughtful gifts for partners and someone special.' },
  { slug: 'mothers-day', label: "Mother's Day", description: 'Show Mum she matters with a packed gift box.' },
  { slug: 'fathers-day', label: "Father's Day", description: 'Gifts Dad will actually use — packed at our hub.' },
  { slug: 'wedding', label: 'Wedding', description: 'Elegant boxes for newlyweds and wedding guests.' },
  { slug: 'thank-you', label: 'Thank you', description: 'Say thanks with a ready-made or custom gift box.' },
  { slug: 'congratulations', label: 'Congratulations', description: 'New job, graduation, promotion — mark the moment.' },
  { slug: 'new-baby', label: 'New baby', description: 'Welcome little ones with a thoughtful bundle.' },
];

export const GIFT_RECIPIENTS: { slug: GiftRecipientSlug; label: string }[] = [
  { slug: 'her', label: 'For her' },
  { slug: 'him', label: 'For him' },
  { slug: 'mum', label: 'For Mum' },
  { slug: 'dad', label: 'For Dad' },
  { slug: 'friend', label: 'For a friend' },
  { slug: 'family', label: 'For family' },
  { slug: 'colleague', label: 'For a colleague' },
  { slug: 'kids', label: 'For kids' },
];

export const GIFT_BUDGETS: { slug: GiftBudgetSlug; label: string; min?: number; max?: number }[] = [
  { slug: 'under-10k', label: 'Under ₦10k', max: 10000 },
  { slug: 'under-20k', label: 'Under ₦20k', max: 20000 },
  { slug: 'under-50k', label: 'Under ₦50k', max: 50000 },
  { slug: 'premium', label: 'Premium (₦50k+)', min: 50000 },
];

export function occasionMeta(slug: string) {
  return GIFT_OCCASIONS.find((o) => o.slug === slug) ?? null;
}

export function isGiftOccasionSlug(slug: string): slug is GiftOccasionSlug {
  return GIFT_OCCASIONS.some((o) => o.slug === slug);
}

/** Client-side filter fallback (API also filters at default GFC). */
export function filterGiftBoxes(
  boxes: GiftBox[],
  filters: { occasion?: string; recipient?: string; budget?: string },
): GiftBox[] {
  const budget = GIFT_BUDGETS.find((b) => b.slug === filters.budget);

  return boxes.filter((box) => {
    if (filters.occasion) {
      const tags = box.occasion_types || [];
      if (tags.length > 0 && !tags.includes(filters.occasion)) return false;
    }
    if (filters.recipient) {
      const tags = box.recipient_types || [];
      if (tags.length > 0 && !tags.includes(filters.recipient)) return false;
    }
    if (budget?.max != null && box.list_price > budget.max) return false;
    if (budget?.min != null && box.list_price < budget.min) return false;
    return true;
  });
}

export function giftFilterSearchParams(filters: {
  occasion?: string;
  recipient?: string;
  budget?: string;
  gfc?: string;
}) {
  const params = new URLSearchParams();
  if (filters.gfc) params.set('gfc', filters.gfc);
  if (filters.occasion) params.set('occasion', filters.occasion);
  if (filters.recipient) params.set('recipient', filters.recipient);
  if (filters.budget) params.set('budget', filters.budget);
  return params;
}
