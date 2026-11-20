import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCampaignShareImageUrl } from '@/lib/campaigns/share-image';
import { getCampaignBySlug, getCampaignQrVariantRefs } from '@/lib/campaigns/get-campaign';
import { resolveCampaignProducts } from '@/lib/campaigns/products';
import { resolveCampaignReviews } from '@/lib/campaigns/reviews';
import { resolveCampaignOffer } from '@/lib/campaigns/offer';
import CampaignTopNav from '@/components/campaigns/TopNav';
import SectionRenderer from '@/components/campaigns/SectionRenderer';
import CampaignFooter from '@/components/campaigns/CampaignFooter';
import AppDownloadSection from '@/components/layout/app-download-section';
import StickyOfferBar from '@/components/campaigns/StickyOfferBar';
import PageViewBeacon from '@/components/campaigns/PageViewBeacon';
import CampaignOffline from '@/components/campaigns/CampaignOffline';

// FE-301 — the customer campaign landing page shell. Fetches server-side via
// the same lib functions the API routes use (BE-201/202/203), rather than
// this page calling its own API over HTTP — this project doesn't have
// TanStack Query wired up anywhere yet (it's a dependency but no
// QueryClientProvider exists), so introducing it just for this one route
// would be new infrastructure, not reuse. Server Components fetching
// directly is the more idiomatic App Router approach anyway.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://julinemart.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'JulineMart';

interface CampaignPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug, { requireActive: false });

  if (!campaign) {
    return { title: `${SITE_NAME} | Campaign` };
  }

  const shareImageUrl = getCampaignShareImageUrl(campaign.heroConfig, SITE_URL);

  return {
    title: `${campaign.publicTitle} | ${SITE_NAME}`,
    description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
    openGraph: {
      title: campaign.metaSeo?.title ?? campaign.publicTitle,
      description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
      images: [{ url: shareImageUrl, alt: campaign.publicTitle }],
      url: `${SITE_URL}/campaigns/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: campaign.metaSeo?.title ?? campaign.publicTitle,
      description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
      images: [shareImageUrl],
    },
  };
}

export default async function CampaignLandingPage({ params }: CampaignPageProps) {
  const { slug } = await params;

  // Fetch with requireActive: false first so we can tell "doesn't exist"
  // (real 404) apart from "exists but paused/expired" (friendly Empty State
  // from the UI Change Plan, not a bare 404).
  const found = await getCampaignBySlug(slug, { requireActive: false });
  if (!found) notFound();

  const now = Date.now();
  const withinWindow =
    (!found.startDate || new Date(found.startDate).getTime() <= now) &&
    (!found.endDate || new Date(found.endDate).getTime() >= now);

  if (found.status !== 'active' || !withinWindow) {
    return <CampaignOffline variant="inactive" />;
  }

  const [{ products, total: totalProducts }, { reviews }, qrVariants, { offer, appliesToAll, usesPerCustomer }] = await Promise.all([
    resolveCampaignProducts(found),
    resolveCampaignReviews(found),
    getCampaignQrVariantRefs(found.id),
    resolveCampaignOffer(found.offerConfig),
  ]);
  // The offer with its discount filled in from the linked voucher.
  const campaign = { ...found, offerConfig: offer };

  const shareImageUrl = getCampaignShareImageUrl(campaign.heroConfig, SITE_URL);

  return (
    <div className="min-h-screen bg-[#f6f5f8]">
      <CampaignTopNav
        campaignName={campaign.publicTitle}
        campaignSlug={campaign.slug}
        endDate={campaign.endDate}
        shareDescription={campaign.metaSeo?.description ?? campaign.heroConfig.subtitle}
        shareImageUrl={shareImageUrl}
      />
      <PageViewBeacon campaignId={campaign.id} qrVariants={qrVariants} />
      {/* The countdown lives in the sticky top bar and the offer in the hero
          badge and coupon ticket, so there is no separate promo pill or
          countdown card here. */}
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-32 pt-4 sm:gap-10 sm:px-6 sm:pb-12 sm:pt-6">
        <SectionRenderer
          campaign={campaign}
          products={products}
          totalProducts={totalProducts}
          reviews={reviews}
          qrVariants={qrVariants}
          codeAppliesToAll={appliesToAll}
          usesPerCustomer={usesPerCustomer}
        />
        <AppDownloadSection />
        <CampaignFooter />
      </div>
      <StickyOfferBar offer={campaign.offerConfig} campaignTitle={campaign.publicTitle} />
    </div>
  );
}
