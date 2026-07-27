import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCampaignBySlug, getCampaignQrVariantRefs } from '@/lib/campaigns/get-campaign';
import { resolveCampaignProducts } from '@/lib/campaigns/products';
import { resolveCampaignReviews } from '@/lib/campaigns/reviews';
import CampaignTopNav from '@/components/campaigns/TopNav';
import PromoBanner from '@/components/campaigns/PromoBanner';
import CampaignCountdown from '@/components/campaigns/CampaignCountdown';
import SectionRenderer from '@/components/campaigns/SectionRenderer';
import CampaignFooter from '@/components/campaigns/CampaignFooter';
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

  return {
    title: `${campaign.publicTitle} | ${SITE_NAME}`,
    description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
    openGraph: {
      title: campaign.metaSeo?.title ?? campaign.publicTitle,
      description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
      images: campaign.metaSeo?.ogImage ? [campaign.metaSeo.ogImage] : undefined,
      url: `${SITE_URL}/campaigns/${slug}`,
    },
  };
}

export default async function CampaignLandingPage({ params }: CampaignPageProps) {
  const { slug } = await params;

  // Fetch with requireActive: false first so we can tell "doesn't exist"
  // (real 404) apart from "exists but paused/expired" (friendly Empty State
  // from the UI Change Plan, not a bare 404).
  const campaign = await getCampaignBySlug(slug, { requireActive: false });
  if (!campaign) notFound();

  const now = Date.now();
  const withinWindow =
    (!campaign.startDate || new Date(campaign.startDate).getTime() <= now) &&
    (!campaign.endDate || new Date(campaign.endDate).getTime() >= now);

  if (campaign.status !== 'active' || !withinWindow) {
    return <CampaignOffline variant="inactive" />;
  }

  const [{ products }, { reviews }, qrVariants] = await Promise.all([
    resolveCampaignProducts(campaign),
    resolveCampaignReviews(campaign),
    getCampaignQrVariantRefs(campaign.id),
  ]);

  return (
    <>
      <CampaignTopNav campaignName={campaign.publicTitle} />
      <PageViewBeacon campaignId={campaign.id} qrVariants={qrVariants} />
      <PromoBanner offerConfig={campaign.offerConfig} />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 pb-28 sm:p-6 sm:pb-8">
        {campaign.endDate && <CampaignCountdown endDate={campaign.endDate} />}
        <SectionRenderer campaign={campaign} products={products} reviews={reviews} qrVariants={qrVariants} />
        <CampaignFooter />
      </div>
      <StickyOfferBar offer={campaign.offerConfig} endDate={campaign.endDate} />
    </>
  );
}
