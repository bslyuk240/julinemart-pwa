import type { Campaign, CampaignBenefit, CampaignMediaItem } from '@/types/campaigns';
import type { Product } from '@/types/product';
import type { CampaignReview } from '@/lib/campaigns/reviews';
import type { CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import { resolveCampaignViewMore } from '@/lib/campaigns/view-more';
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
  reviews,
  qrVariants,
}: {
  campaign: Campaign;
  products: Product[];
  reviews: CampaignReview[];
  qrVariants: CampaignQrVariantRef[];
}) {
  const viewMore = resolveCampaignViewMore(campaign, products);

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
                offerText={campaign.offerConfig?.displayText}
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
                offer={campaign.offerConfig}
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
