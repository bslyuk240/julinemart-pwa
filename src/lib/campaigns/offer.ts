import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { CampaignOfferConfig } from '@/types/campaigns';

interface VoucherDiscountRow {
  status: string | null;
  max_uses_per_customer: number | null;
  discount_type: 'free' | 'percentage' | 'fixed_amount' | null;
  discount_value: number | null;
  shipping_discount_type: 'none' | 'percentage' | 'fixed' | 'free' | null;
  valid_until: string | null;
  product_ids: string[] | null;
  product_skus: string[] | null;
  vendor_ids: string[] | null;
  category_ids: string[] | null;
  gift_box_skus: string[] | null;
  gift_occasion_slugs: string[] | null;
  gift_recipient_slugs: string[] | null;
}

export interface ResolvedCampaignOffer {
  offer?: CampaignOfferConfig;
  /**
   * True when the code works on every product (no product, vendor, category
   * or gift limits on the voucher), so a per-product "20% off with code" line
   * is honest.
   */
  appliesToAll: boolean;
  /** How many times one customer may use the code (checkout enforces it per email). Undefined when unlimited or unknown. */
  usesPerCustomer?: number;
}

const LIMIT_FIELDS = [
  'product_ids',
  'product_skus',
  'vendor_ids',
  'category_ids',
  'gift_box_skus',
  'gift_occasion_slugs',
  'gift_recipient_slugs',
] as const;

/**
 * Campaign offers usually link a `campaign_vouchers` row and leave the
 * discount fields blank, so the page could only repeat the campaign title.
 * Fill the blanks from the voucher. Fields already set on the campaign win.
 */
export async function resolveCampaignOffer(offer?: CampaignOfferConfig): Promise<ResolvedCampaignOffer> {
  if (!offer?.voucherId) {
    return {
      offer,
      appliesToAll: Boolean(offer?.couponCode) && !offer?.minimumSpend && !offer?.newCustomersOnly,
    };
  }

  const { data, error } = await getSupabaseServerClient()
    .from('campaign_vouchers')
    .select(
      'status, max_uses_per_customer, discount_type, discount_value, shipping_discount_type, valid_until, product_ids, product_skus, vendor_ids, category_ids, gift_box_skus, gift_occasion_slugs, gift_recipient_slugs'
    )
    .eq('id', offer.voucherId)
    .maybeSingle<VoucherDiscountRow>();

  // Unknown voucher: keep the campaign's own copy, and don't promise a saving per product.
  if (error || !data) return { offer, appliesToAll: false };

  // An inactive or expired voucher won't work at checkout, so don't advertise its discount.
  const expired = data.valid_until != null && new Date(data.valid_until).getTime() < Date.now();
  if (data.status !== 'active' || expired) return { offer, appliesToAll: false };

  const limited = LIMIT_FIELDS.some((field) => (data[field]?.length ?? 0) > 0);
  const merged: CampaignOfferConfig = { ...offer };
  if (!merged.discountType && data.discount_type && data.discount_type !== 'free') {
    merged.discountType = data.discount_type;
    if (merged.discountValue == null && data.discount_value != null) merged.discountValue = Number(data.discount_value);
  }
  if (merged.freeDelivery == null && data.shipping_discount_type === 'free') merged.freeDelivery = true;
  if (!merged.expirationDate && data.valid_until) merged.expirationDate = data.valid_until;

  // Min. spend and new-customer rules mean not every product qualifies on its own.
  const conditional = Boolean(merged.minimumSpend) || Boolean(merged.newCustomersOnly);
  const perCustomer = Number(data.max_uses_per_customer);
  return {
    offer: merged,
    appliesToAll: !limited && !conditional,
    usesPerCustomer: Number.isFinite(perCustomer) && perCustomer > 0 ? perCustomer : undefined,
  };
}
