import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCampaignShareImageUrl } from '@/lib/campaigns/share-image';
import { getCampaignBySlug, getCampaignQrVariantRefs } from '@/lib/campaigns/get-campaign';
import { attachVariationsToProducts, resolveAllCampaignProducts } from '@/lib/campaigns/products';
import { campaignProductsHref } from '@/lib/campaigns/view-more';
import CampaignTopNav from '@/components/campaigns/TopNav';
import PromoBanner from '@/components/campaigns/PromoBanner';
import CampaignProductGrid from '@/components/campaigns/CampaignProductGrid';
import CampaignFooter from '@/components/campaigns/CampaignFooter';
import StickyOfferBar from '@/components/campaigns/StickyOfferBar';
import CampaignOffline from '@/components/campaigns/CampaignOffline';

// "View all" for a campaign: every product the campaign's own rules match (not capped to the landing page preview),
// paged. Same cards, quick view and cart behaviour as the landing page, same active/expired rules.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://julinemart.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'JulineMart';
const PAGE_SIZE = 24;

interface CampaignProductsPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CampaignProductsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug, { requireActive: false });
  if (!campaign) return { title: `${SITE_NAME} | Campaign` };
  return {
    title: `All products: ${campaign.publicTitle} | ${SITE_NAME}`,
    description: campaign.metaSeo?.description ?? campaign.heroConfig.subtitle,
    alternates: { canonical: `${SITE_URL}/campaigns/${slug}/products` },
  };
}

/** Page numbers to show: first, last, and a window around the current page, with gaps marked as null. */
function pageWindow(current: number, totalPages: number): (number | null)[] {
  const wanted = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const pages = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  pages.forEach((n, i) => {
    if (i > 0 && n - pages[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}

export default async function CampaignProductsPage({ params, searchParams }: CampaignProductsPageProps) {
  const { slug } = await params;
  const { page: rawPage } = await searchParams;

  const campaign = await getCampaignBySlug(slug, { requireActive: false });
  if (!campaign) notFound();

  const now = Date.now();
  const withinWindow =
    (!campaign.startDate || new Date(campaign.startDate).getTime() <= now) &&
    (!campaign.endDate || new Date(campaign.endDate).getTime() >= now);
  if (campaign.status !== 'active' || !withinWindow) {
    return <CampaignOffline variant="inactive" />;
  }

  const [{ products: all, total }, qrVariants] = await Promise.all([
    resolveAllCampaignProducts(campaign),
    getCampaignQrVariantRefs(campaign.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.parseInt(Array.isArray(rawPage) ? rawPage[0] : (rawPage ?? '1'), 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
  const pageProducts = await attachVariationsToProducts(all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));

  const shareImageUrl = getCampaignShareImageUrl(campaign.heroConfig, SITE_URL);
  const backHref = `/campaigns/${encodeURIComponent(campaign.slug)}`;
  const linkCls =
    'inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border-2 px-3 text-sm font-extrabold';

  return (
    <>
      <CampaignTopNav
        campaignName={campaign.publicTitle}
        campaignSlug={campaign.slug}
        shareDescription={campaign.metaSeo?.description ?? campaign.heroConfig.subtitle}
        shareImageUrl={shareImageUrl}
      />
      <PromoBanner offerConfig={campaign.offerConfig} />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 pb-28 sm:p-6 sm:pb-8">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-extrabold text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4" />
          Back to {campaign.publicTitle}
        </Link>

        <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5">
            <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary-600">All campaign products</p>
            <h1 className="text-xl font-extrabold text-gray-900">{campaign.publicTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {total === 0
                ? 'No products are available right now.'
                : `${total} product${total === 1 ? '' : 's'}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ''}`}
            </p>
          </div>

          {pageProducts.length > 0 && (
            <CampaignProductGrid
              campaignId={campaign.id}
              campaignSlug={campaign.slug}
              campaignTitle={campaign.publicTitle}
              offerText={campaign.offerConfig?.displayText}
              products={pageProducts}
              qrVariants={qrVariants}
            />
          )}

          {totalPages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
              {page > 1 && (
                <Link href={campaignProductsHref(campaign.slug, page - 1)} className={`${linkCls} border-gray-200 text-gray-700`} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Link>
              )}
              {pageWindow(page, totalPages).map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
                ) : (
                  <Link
                    key={n}
                    href={campaignProductsHref(campaign.slug, n)}
                    aria-current={n === page ? 'page' : undefined}
                    className={`${linkCls} ${n === page ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 text-gray-700 hover:border-primary-600'}`}
                  >
                    {n}
                  </Link>
                ),
              )}
              {page < totalPages && (
                <Link href={campaignProductsHref(campaign.slug, page + 1)} className={`${linkCls} border-gray-200 text-gray-700`} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </nav>
          )}
        </section>

        <CampaignFooter />
      </div>
      <StickyOfferBar offer={campaign.offerConfig} endDate={campaign.endDate} />
    </>
  );
}
