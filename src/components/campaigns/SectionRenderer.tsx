import type { Campaign, CampaignBenefit, CampaignMediaItem } from '@/types/campaigns';
import type { Product } from '@/types/product';
import type { CampaignReview } from '@/lib/campaigns/reviews';
import type { CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import { resolveCampaignViewMore } from '@/lib/campaigns/view-more';
import { offerHeadline, perProductCodeLabel } from '@/lib/campaigns/offer-copy';
import HeroSection from '@/components/campaigns/HeroSection';
import BenefitsSection from '@/components/campaigns/BenefitsSection';
import VendorStorySection from '@/components/campaigns/VendorStorySection';
import ProductsSection from '@/components/campaigns/ProductsSection';
import OfferSection from '@/components/campaigns/OfferSection';
import ReviewsSection from '@/components/campaigns/ReviewsSection';
import MediaGallerySection from '@/components/campaigns/MediaGallerySection';
import GiveawayEntrySection from '@/components/campaigns/GiveawayEntrySection';

// FE-303 — maps the campaign_sections payload to components in order.
// Unrecognized/unsupported section types are silently skipped rather than
// erroring — matches the layout-reducer edge case in the Test Plan ("invalid
// section identifiers are ignored instead of causing execution-level crashes").
export default function SectionRenderer({
  campaign,
  products,
  totalProducts,
  reviews,
  qrVariants,
  codeAppliesToAll = false,
  usesPerCustomer,
}: {
  campaign: Campaign;
  /** The campaign code works on every product (no voucher limits). */
  codeAppliesToAll?: boolean;
  /** Per-customer limit on the linked voucher, for the coupon ticket. */
  usesPerCustomer?: number;
  products: Product[];
  /** Every product the rules match; more than products.length means a "view all" link is shown. */
  totalProducts?: number;
  reviews: CampaignReview[];
  qrVariants: CampaignQrVariantRef[];
}) {
  const viewMore = resolveCampaignViewMore(campaign, products.length, totalProducts ?? products.length);
  // Only advertise a per-product saving when there is a code that covers every product.
  // Fixed-amount and free-delivery codes are order-level, so they never get a per-product line.
  const codeDiscountLabel = codeAppliesToAll ? perProductCodeLabel(campaign.offerConfig) : null;
  // Carried to the quick view and product page; resolved so it never just repeats the title.
  const offerText = campaign.offerConfig?.couponCode
    ? offerHeadline(campaign.offerConfig, campaign.publicTitle)
    : campaign.offerConfig?.displayText;

  return (
    <>
      {campaign.sectionLayout.map((section) => {
        switch (section.sectionType) {
          case 'hero':
            return <HeroSection key={section.id} campaign={campaign} qrVariants={qrVariants} />;
          case 'benefits':
            return (
              <BenefitsSection
                key={section.id}
                benefits={section.config.benefits as CampaignBenefit[] | undefined}
              />
            );
          case 'vendor_story':
            return (
              <VendorStorySection
                key={section.id}
                campaignId={campaign.id}
                vendor={campaign.vendorOverride}
                qrVariants={qrVariants}
              />
            );
          case 'products':
            return (
              <ProductsSection
                key={section.id}
                campaignId={campaign.id}
                campaignSlug={campaign.slug}
                campaignTitle={campaign.publicTitle}
                offerText={offerText}
                codeDiscountLabel={codeDiscountLabel}
                products={products}
                viewMore={viewMore}
                qrVariants={qrVariants}
              />
            );
          case 'offer':
            return (
              <OfferSection
                key={section.id}
                campaignId={campaign.id}
                campaignTitle={campaign.publicTitle}
                endDate={campaign.endDate}
                offer={campaign.offerConfig}
                usesPerCustomer={usesPerCustomer}
                qrVariants={qrVariants}
              />
            );
          case 'reviews':
            return <ReviewsSection key={section.id} reviews={reviews} />;
          case 'media_gallery':
            return (
              <MediaGallerySection
                key={section.id}
                campaignId={campaign.id}
                items={section.config.items as CampaignMediaItem[] | undefined}
                title={typeof section.config.title === 'string' ? section.config.title : undefined}
                qrVariants={qrVariants}
              />
            );
          case 'giveaway_entry':
            return (
              <GiveawayEntrySection
                key={section.id}
                campaignId={campaign.id}
                slug={campaign.slug}
                publicTitle={campaign.publicTitle}
                startDate={campaign.startDate}
                endDate={campaign.endDate}
                grandPrizeDescription={campaign.grandPrizeDescription ?? undefined}
                qrVariants={qrVariants}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
