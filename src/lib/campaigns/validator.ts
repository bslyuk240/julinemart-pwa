import { getSupabaseServerClient } from '@/lib/supabase-server';
import { resolveCampaignProducts } from '@/lib/campaigns/products';
import type { Campaign } from '@/types/campaigns';

// BE-205 — sanity checks run before/while rendering a campaign: stock
// availability, linked-voucher validity, and date-window integrity. This
// checks the existing `campaign_vouchers` table (see Appendix C), not a
// WooCommerce coupon API as the PRD assumed — there's no separate coupon
// system to check against.

export interface CampaignValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface VoucherRow {
  status: string;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  current_uses: number | null;
}

async function checkVoucher(voucherId: string): Promise<string | null> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('campaign_vouchers')
    .select('status, valid_from, valid_until, max_uses, current_uses')
    .eq('id', voucherId)
    .maybeSingle<VoucherRow>();

  if (!data) return 'Linked voucher no longer exists.';
  if (data.status !== 'active') return `Linked voucher is ${data.status}, not active.`;

  const now = Date.now();
  if (data.valid_from && new Date(data.valid_from).getTime() > now) {
    return 'Linked voucher is not valid yet.';
  }
  if (data.valid_until && new Date(data.valid_until).getTime() < now) {
    return 'Linked voucher has expired.';
  }
  if (data.max_uses != null && (data.current_uses ?? 0) >= data.max_uses) {
    return 'Linked voucher has hit its usage limit.';
  }
  return null;
}

export async function validateCampaign(campaign: Campaign): Promise<CampaignValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (campaign.startDate && campaign.endDate) {
    if (new Date(campaign.startDate).getTime() >= new Date(campaign.endDate).getTime()) {
      errors.push('End date must be after start date.');
    }
  }

  if (campaign.offerConfig?.voucherId) {
    const voucherIssue = await checkVoucher(campaign.offerConfig.voucherId);
    if (voucherIssue) warnings.push(voucherIssue);
  }

  const { products } = await resolveCampaignProducts(campaign);
  if (products.length === 0) {
    warnings.push('No products currently match this campaign\'s product rules.');
  }

  return { valid: errors.length === 0, errors, warnings };
}
