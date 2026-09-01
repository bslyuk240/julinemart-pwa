import { z } from 'zod';

// SEC-402 — Zod schemas for every campaign input. The create/update/QR
// schemas here aren't wired into a route yet (the admin-facing mutation
// endpoints are still open — see Phase 2/Phase 5 in the build plan), but the
// PRD calls for validation on "every campaign input", so these are ready for
// whichever endpoint consumes them first.

const sectionTypeSchema = z.enum([
  'hero',
  'benefits',
  'vendor_story',
  'products',
  'offer',
  'reviews',
  'media_gallery',
  'cta_footer',
  'giveaway_entry',
]);

const reviewScopeSchema = z.enum(['product', 'featured_products', 'vendor', 'category', 'mixed']);

export const campaignHeroConfigSchema = z.object({
  headline: z.string().min(1).max(150),
  subtitle: z.string().max(300),
  heroImageDesktop: z.string().url().optional(),
  heroImageMobile: z.string().url().optional(),
  introductoryVideoUrl: z.string().url().optional(),
  ctaLabel: z.string().min(1).max(40),
  ctaActionUrl: z.string().optional(),
  secondaryCtaLabel: z.string().max(40).optional(),
  secondaryCtaVideoUrl: z.string().url().optional(),
  badgeText: z.string().max(60).optional(),
  brandThemePalette: z
    .object({ primaryColor: z.string().optional(), badgeTextColor: z.string().optional() })
    .optional(),
});

export const campaignProductSelectionRulesSchema = z.object({
  source: z.enum(['automatic', 'manual', 'rules_based']),
  vendorId: z.union([z.string(), z.number()]).optional(),
  categoryIds: z.array(z.union([z.string(), z.number()])).optional(),
  manualProductIds: z.array(z.union([z.string(), z.number()])).optional(),
  pinnedProductIds: z.array(z.union([z.string(), z.number()])).optional(),
  minimumRating: z.number().min(0).max(5).optional(),
  inStockOnly: z.boolean().optional(),
  discountedOnly: z.boolean().optional(),
  maxProducts: z.number().int().min(1).max(50).optional(),
  excludeSkus: z.array(z.string()).optional(),
});

export const campaignReviewRulesSchema = z.object({
  scope: reviewScopeSchema,
  minimumRating: z.number().min(0).max(5).optional(),
  maxReviews: z.number().int().min(1).max(50).optional(),
  verifiedPurchaseOnly: z.boolean().optional(),
  imagesOnly: z.boolean().optional(),
  sort: z.enum(['newest', 'highest_rated', 'manual']).optional(),
  allowVideoTestimonials: z.boolean().optional(),
  fallbackScope: reviewScopeSchema.optional(),
  manualExclusionIds: z.array(z.string()).optional(),
});

// Links an existing `campaign_vouchers` row rather than defining a parallel
// discount engine — see Appendix C.
export const campaignOfferConfigSchema = z
  .object({
    voucherId: z.string().uuid().optional(),
    couponCode: z.string().max(30).optional(),
    discountType: z.enum(['free', 'percentage', 'fixed_amount']).optional(),
    discountValue: z.number().min(0).optional(),
    freeDelivery: z.boolean().optional(),
    minimumSpend: z.number().min(0).optional(),
    newCustomersOnly: z.boolean().optional(),
    displayText: z.string().max(200).optional(),
    expirationDate: z.string().datetime().optional(),
  })
  // Test Plan §2.5 edge case: "Percentage adjustments configured above 100%"
  // must fail. Only meaningful for discountType === 'percentage' — a fixed
  // amount or "free" offer has no such ceiling.
  .refine((val) => val.discountType !== 'percentage' || val.discountValue == null || val.discountValue <= 100, {
    message: 'Percentage discount cannot exceed 100',
    path: ['discountValue'],
  });

const campaignSectionInputSchema = z.object({
  sectionType: sectionTypeSchema,
  orderIndex: z.number().int().min(0),
  isVisible: z.boolean().default(true),
  config: z.record(z.unknown()).default({}),
});

export const campaignCreateSchema = z
  .object({
    internalName: z.string().min(3).max(255),
    publicTitle: z.string().min(3).max(255),
    slug: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and single dashes only'),
    campaignObjective: z.string().max(255).optional(),
    status: z.enum(['draft', 'scheduled', 'active', 'paused', 'expired', 'archived']).default('draft'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    targetType: z.enum(['vendor', 'category', 'product', 'collection', 'multi_vendor', 'general']),
    targetId: z.string().optional(),
    templateId: z.string().optional(),

    sectionLayout: z.array(campaignSectionInputSchema).max(20).default([]),
    heroConfig: campaignHeroConfigSchema,
    vendorOverride: z.record(z.unknown()).optional(),
    productSelectionRules: campaignProductSelectionRulesSchema,
    reviewRules: campaignReviewRulesSchema,
    offerConfig: campaignOfferConfigSchema.optional(),
    metaSeo: z
      .object({ title: z.string().optional(), description: z.string().optional(), ogImage: z.string().url().optional() })
      .optional(),
  })
  .refine((val) => !val.startDate || !val.endDate || new Date(val.startDate) < new Date(val.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export const campaignUpdateSchema = campaignCreateSchema.innerType().partial();

// QR channel variant — admin creates one per physical/digital placement
// (poster, flyer, Instagram bio, etc.), each with its own tracking slug.
export const campaignQrVariantSchema = z.object({
  channelName: z.string().min(1).max(100),
  trackingSlug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Tracking slug must be lowercase letters, numbers, and single dashes only'),
});

export const campaignAnalyticsEventSchema = z.object({
  campaignId: z.string().uuid(),
  qrId: z.string().uuid().optional(),
  eventType: z.enum([
    'scan',
    'page_visit',
    'video_view',
    'cta_click',
    'add_to_cart',
    'checkout_start',
    'checkout_complete',
  ]),
  visitorSessionId: z.string().min(1).max(255),
  userId: z.string().max(255).optional(),
  orderId: z.string().max(255).optional(),
  revenue: z.number().min(0).max(1_000_000_000).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CampaignAnalyticsEventInput = z.infer<typeof campaignAnalyticsEventSchema>;
