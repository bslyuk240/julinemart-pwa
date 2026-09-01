import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { Campaign, CampaignKind, CampaignSection, CampaignSectionType, CampaignOfferConfig, CampaignSummary } from '@/types/campaigns';

interface CampaignRow {
  id: string;
  slug: string;
  internal_name: string;
  public_title: string;
  campaign_objective: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_type: string;
  target_id: string | null;
  template_id: string | null;
  section_layout: unknown;
  hero_config: Record<string, unknown> | null;
  vendor_override: Record<string, unknown> | null;
  product_selection_rules: Record<string, unknown> | null;
  review_rules: Record<string, unknown> | null;
  offer_config: Record<string, unknown> | null;
  meta_seo: Record<string, unknown> | null;
  vendor_id?: string | null;
  approval_status?: string | null;
  // Giveaway fields — deliberately NOT including secret_code here even though
  // `select('*')` fetches it: mapCampaign() below is a whitelist, and the
  // secret code must never be serialized into the page sent to the browser.
  campaign_kind?: string | null;
  grand_prize_description?: string | null;
  created_at: string;
  updated_at: string;
}

interface SectionRow {
  id: string;
  campaign_id: string;
  section_type: string;
  order_index: number;
  is_visible: boolean;
  config: Record<string, unknown>;
  created_at: string;
}

function mapSection(row: SectionRow): CampaignSection {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    sectionType: row.section_type as CampaignSectionType,
    orderIndex: row.order_index,
    isVisible: row.is_visible,
    config: row.config ?? {},
    createdAt: row.created_at,
  };
}

function mapCampaign(row: CampaignRow, sections: SectionRow[]): Campaign {
  return {
    id: row.id,
    slug: row.slug,
    internalName: row.internal_name,
    publicTitle: row.public_title,
    campaignObjective: row.campaign_objective ?? undefined,
    status: row.status as Campaign['status'],
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    targetType: row.target_type as Campaign['targetType'],
    targetId: row.target_id ?? undefined,
    templateId: row.template_id ?? undefined,

    sectionLayout: sections.map(mapSection),
    heroConfig: (row.hero_config as unknown as Campaign['heroConfig']) ?? {
      headline: '',
      subtitle: '',
      ctaLabel: 'Shop Now',
    },
    vendorOverride: (row.vendor_override as unknown as Campaign['vendorOverride']) ?? undefined,
    productSelectionRules: (row.product_selection_rules as unknown as Campaign['productSelectionRules']) ?? {
      source: 'automatic',
    },
    reviewRules: (row.review_rules as unknown as Campaign['reviewRules']) ?? { scope: 'mixed' },
    offerConfig: (row.offer_config as unknown as Campaign['offerConfig']) ?? undefined,
    metaSeo: (row.meta_seo as unknown as Campaign['metaSeo']) ?? undefined,

    campaignKind: (row.campaign_kind as CampaignKind | undefined) ?? 'merchandising',
    grandPrizeDescription: row.grand_prize_description ?? undefined,

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Active-window check done in app code (not just in the RLS policy) so the
// service-role client — which bypasses RLS — still respects it consistently
// for the public GET route. Admin/preview routes should query with
// requireActive: false instead of relying on this helper's default.
function isVendorCampaignApproved(row: CampaignRow): boolean {
  if (!row.vendor_id) return true;
  return row.approval_status === 'approved';
}

function isWithinActiveWindow(row: CampaignRow): boolean {
  if (row.status !== 'active') return false;
  if (!isVendorCampaignApproved(row)) return false;
  const now = Date.now();
  if (row.start_date && new Date(row.start_date).getTime() > now) return false;
  if (row.end_date && new Date(row.end_date).getTime() < now) return false;
  return true;
}

export async function getCampaignBySlug(
  slug: string,
  options: { requireActive?: boolean } = {}
): Promise<Campaign | null> {
  const requireActive = options.requireActive ?? true;
  const supabase = getSupabaseServerClient();

  const { data: campaignRow, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<CampaignRow>();

  if (campaignError || !campaignRow) return null;
  if (requireActive && !isWithinActiveWindow(campaignRow)) return null;
  if (!requireActive && campaignRow.vendor_id && campaignRow.approval_status !== 'approved') return null;

  const { data: sectionRows, error: sectionsError } = await supabase
    .from('campaign_sections')
    .select('*')
    .eq('campaign_id', campaignRow.id)
    .eq('is_visible', true)
    .order('order_index', { ascending: true });

  if (sectionsError) return null;

  return mapCampaign(campaignRow, (sectionRows as SectionRow[]) ?? []);
}

// Feeds the client telemetry hook's tracking_slug -> qr_id resolution
// (?qr_source= carries the slug, never the uuid, so this lookup has to
// happen somewhere — doing it server-side here avoids a second client-side
// Supabase client just for this one lookup).
function buildOfferLabel(offer?: CampaignOfferConfig): string | undefined {
  if (!offer) return undefined;
  if (offer.displayText) return offer.displayText;
  if (offer.discountType === 'percentage' && offer.discountValue) {
    return `${offer.discountValue}% off`;
  }
  if (offer.discountType === 'fixed_amount' && offer.discountValue) {
    return `₦${offer.discountValue.toLocaleString()} off`;
  }
  if (offer.freeDelivery) return 'Free delivery';
  if (offer.couponCode) return `Use code ${offer.couponCode}`;
  return undefined;
}

function mapCampaignSummary(row: CampaignRow): CampaignSummary | null {
  if (!isWithinActiveWindow(row)) return null;

  const heroConfig = (row.hero_config as unknown as Campaign['heroConfig']) ?? {
    headline: '',
    subtitle: '',
    ctaLabel: 'Shop Now',
  };
  const offerConfig = (row.offer_config ?? undefined) as CampaignOfferConfig | undefined;

  return {
    id: row.id,
    slug: row.slug,
    publicTitle: row.public_title,
    offerLabel: buildOfferLabel(offerConfig),
    heroImage: heroConfig.heroImageMobile ?? heroConfig.heroImageDesktop,
    badgeText: heroConfig.badgeText,
    endDate: row.end_date ?? undefined,
  };
}

/** Active campaigns for homepage promos — no sections/products payload. */
export async function getActiveCampaignSummaries(): Promise<CampaignSummary[]> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from('campaigns')
    .select('id, slug, public_title, status, start_date, end_date, hero_config, offer_config, vendor_id, approval_status')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return (data as CampaignRow[])
    .map(mapCampaignSummary)
    .filter((item): item is CampaignSummary => item !== null);
}

export async function getCampaignQrVariantRefs(
  campaignId: string
): Promise<{ id: string; trackingSlug: string }[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('campaign_qr_variants')
    .select('id, tracking_slug')
    .eq('campaign_id', campaignId);

  if (error || !data) return [];
  return data.map((row: { id: string; tracking_slug: string }) => ({ id: row.id, trackingSlug: row.tracking_slug }));
}
