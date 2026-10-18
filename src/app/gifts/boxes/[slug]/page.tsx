import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Clock, Package, Star } from 'lucide-react';
import GiftBoxGallery from '@/components/gifts/gift-box-gallery';
import GiftBoxCard from '@/components/gifts/gift-box-card';
import GiftBoxReviewTabs from '@/components/gifts/gift-box-review-tabs';
import GiftBoxActions from '@/components/gifts/gift-box-actions';
import { fetchGiftBoxBySlug, fetchGiftBoxes } from '@/lib/jlo/gifts';
import { giftLeadCopy } from '@/lib/gifts/lead-copy';
import { formatPrice } from '@/lib/utils/format-price';
import PageHeader from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import GiftAnalyticsBeacon from '@/components/gifts/gift-analytics-beacon';
import { GiftBoxMobileBar, GiftBoxMobileTopBar } from '@/components/gifts/gift-box-mobile';
import { getMobileTierRoute } from '@/lib/mobile/mobile-tier-routes';
import { clsx } from 'clsx';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { box } = await fetchGiftBoxBySlug(slug);
  if (!box) return { title: 'Gift box | JulineMart Gifts' };
  return {
    title: `${box.name} | JulineMart Gifts`,
    description: box.description || `Send the ${box.name} curated gift box.`,
  };
}

export default async function GiftBoxPage({ params }: Props) {
  const { slug } = await params;
  const { box, gfc } = await fetchGiftBoxBySlug(slug);
  if (!box) notFound();
  const leadCopy = giftLeadCopy(box.lead_time_days);
  const ratingCount = box.rating_count ?? 0;
  const averageRating = box.average_rating ?? 0;

  const relatedFilter = box.occasion_types[0]
    ? { occasion: box.occasion_types[0] }
    : box.recipient_types[0]
      ? { recipient: box.recipient_types[0] }
      : {};
  const { boxes: relatedCandidates } = await fetchGiftBoxes(gfc?.code, relatedFilter);
  const relatedBoxes = relatedCandidates.filter((b) => b.slug !== box.slug).slice(0, 8);
  // Mobile tier: same allowlist switch as the client chrome (docs/mobile-tier-plan.md).
  const tier = getMobileTierRoute(`/gifts/boxes/${slug}`) !== null;

  return (
    <main className={clsx('min-h-screen bg-gray-50 pb-24', tier && 'max-md:bg-white max-md:pb-0')}>
      <GiftBoxMobileTopBar box={box} />
      <GiftAnalyticsBeacon
        kind="box"
        boxSlug={box.slug}
        boxName={box.name}
        price={box.list_price}
      />
      <div className={clsx('container-custom py-5 md:py-8 max-w-6xl', tier && 'max-md:pt-0')}>
        <div className={clsx(tier && 'max-md:hidden')}>
          <PageHeader backHref="/gifts" backLabel="All gift boxes" />
        </div>

        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
          <div
            className={clsx(
              'mb-6 overflow-hidden rounded-2xl border bg-white shadow-sm lg:mb-0',
              tier && 'max-md:-mx-4 max-md:rounded-none max-md:border-x-0 max-md:border-t-0 max-md:shadow-none',
            )}
          >
            <GiftBoxGallery
              name={box.name}
              coverUrl={box.image_url}
              galleryUrls={box.gallery_urls}
            />
            {box.contents.length > 0 && (
              <div className="p-5 md:p-6 border-t lg:hidden">
                <h2 className="text-sm font-semibold text-gray-900 mb-3">What&apos;s inside</h2>
                <ul className="space-y-2">
                  {box.contents.map((item) => (
                    <li key={item.pool_sourced_item_id || item.product_id || item.name} className="flex items-center gap-3 text-sm text-gray-700">
                      <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium">
                        {item.quantity}×
                      </span>
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="lg:sticky lg:top-24 space-y-5">
              <div>
                <h1
                  className={clsx(
                    'text-base md:text-xl font-bold text-gray-900 mb-2 leading-tight line-clamp-2',
                    tier && 'max-md:text-[22px] max-md:font-medium max-md:leading-7 max-md:text-m-on-surface',
                  )}
                >
                  {box.name}
                </h1>

                {ratingCount > 0 && (
                  <div className="flex items-center gap-2 md:gap-3 mb-3">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 md:w-5 md:h-5 ${
                            i < Math.floor(averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {averageRating.toFixed(1)} ({ratingCount} review{ratingCount === 1 ? '' : 's'})
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={clsx(
                      'text-lg md:text-xl font-bold text-primary-600',
                      tier && 'max-md:text-[28px] max-md:leading-9 max-md:tracking-[-0.02em] max-md:tabular-nums max-md:text-m-on-surface',
                    )}
                  >
                    {formatPrice(box.list_price)}
                  </span>
                </div>

                <p className="text-sm text-gray-600">{box.item_count} curated items included</p>
              </div>
              {gfc ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Package className="w-4 h-4 shrink-0" />
                  Packed at {gfc.name} · {gfc.city}, {gfc.state}
                </p>
              ) : null}
              {leadCopy ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4 shrink-0" />
                  {leadCopy}
                </p>
              ) : null}

              {box.contents.length > 0 && (
                <div className="hidden lg:block bg-white rounded-2xl border p-5">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">What&apos;s inside</h2>
                  <ul className="space-y-2">
                    {box.contents.map((item) => (
                      <li key={item.pool_sourced_item_id || item.product_id || item.name} className="flex items-center gap-3 text-sm text-gray-700">
                        <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-medium">
                          {item.quantity}×
                        </span>
                        <span>{item.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className={clsx('flex gap-3', tier && 'max-md:hidden')}>
                <Link href={`/gifts/checkout?box=${encodeURIComponent(box.slug)}`} className="flex-1">
                  <Button className="w-full h-12 md:h-14 text-base gap-2">
                    Send this gift
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <GiftBoxActions box={box} />
              </div>
              <Link
                href="/gifts/build"
                className="block text-center text-sm font-medium text-primary-700 hover:text-primary-900"
              >
                Or build your own box
              </Link>
            </div>
          </div>
        </div>

        <GiftBoxReviewTabs
          giftBoxId={box.id}
          slug={box.slug}
          description={box.description}
          averageRating={averageRating}
          ratingCount={ratingCount}
        />

        {relatedBoxes.length > 0 && (
          <section className="border-t pt-8 mt-8">
            <h2 className="text-sm md:text-base font-bold text-gray-900 mb-4 md:mb-6">Related gift boxes</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible">
              {relatedBoxes.map((related) => (
                <GiftBoxCard key={related.id} box={related} />
              ))}
            </div>
          </section>
        )}
      </div>
      <GiftBoxMobileBar box={box} />
    </main>
  );
}
