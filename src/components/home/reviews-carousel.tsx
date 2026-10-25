import Link from 'next/link';
import { BadgeCheck, MessageSquareQuote, Star } from 'lucide-react';
import { getHomepageReviews } from '@/lib/homepage-reviews';
import MobileSectionHeader from '@/components/home/mobile-section-header';

function ReviewCard({ review }: { review: HomepageReview }) {
  const content = (
    <>
      <MessageSquareQuote className="mb-2 h-4 w-4 shrink-0 text-secondary-500 opacity-70" aria-hidden />
      <p className="line-clamp-3 flex-1 text-sm leading-snug text-gray-800">&ldquo;{review.body}&rdquo;</p>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="flex gap-0.5 text-secondary-500" aria-label={`${review.rating} out of 5 stars`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3 w-3"
              fill={i < review.rating ? 'currentColor' : 'none'}
              aria-hidden
            />
          ))}
        </span>
        {review.verifiedPurchase && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700">
            <BadgeCheck className="h-2.5 w-2.5" aria-hidden />
            Verified
          </span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        {review.productName && (
          <p className="line-clamp-1 text-xs font-bold leading-tight text-primary-700">
            {review.productName}
          </p>
        )}
        <p className="mt-0.5 truncate text-[11px] text-gray-500">{review.reviewerName}</p>
      </div>
    </>
  );

  if (review.productSlug) {
    return (
      <Link
        href={`/product/${review.productSlug}`}
        className="flex h-[148px] w-[240px] shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="flex h-[148px] w-[240px] shrink-0 flex-col rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      {content}
    </article>
  );
}

type HomepageReview = Awaited<ReturnType<typeof getHomepageReviews>>[number];

/** Phones show only product reviews that say something (5+ words), with the product they're about. */
function isPhoneWorthy(review: HomepageReview) {
  return Boolean(review.productName && review.productSlug) && review.body.trim().split(/\s+/).length >= 5;
}

function PhoneReviewCard({ review }: { review: HomepageReview }) {
  return (
    <Link
      href={`/product/${review.productSlug}`}
      className="flex w-[264px] flex-none snap-start flex-col gap-2 rounded-m-card bg-m-surface-low p-4 text-m-on-surface"
    >
      <span className="flex gap-0.5 text-[#c47f00]" role="img" aria-label={`${review.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4" fill={i < review.rating ? 'currentColor' : 'none'} aria-hidden />
        ))}
      </span>
      <p className="line-clamp-3 flex-1 text-m-body-m">&ldquo;{review.body}&rdquo;</p>
      <p className="truncate text-m-body-s text-m-on-surface-variant">
        <span className="font-semibold text-m-on-surface">{review.reviewerName}</span>
        {review.verifiedPurchase && ' · Verified purchase'}
      </p>
      <p className="truncate text-m-label-m text-m-primary">{review.productName}</p>
    </Link>
  );
}

export default async function ReviewsCarousel() {
  const reviews = await getHomepageReviews();
  if (reviews.length === 0) return null;
  const phoneReviews = reviews.filter(isPhoneWorthy).slice(0, 8);

  return (
    <>
      {phoneReviews.length > 0 && (
        <section className="pt-3 md:hidden" aria-labelledby="home-reviews-title">
          <MobileSectionHeader id="home-reviews-title" title="What shoppers say" />
          <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {phoneReviews.map((review) => (
              <PhoneReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      )}
      <section className="border-t border-gray-200 bg-gray-50 py-4 max-md:hidden md:py-6">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-3 flex items-center gap-2 md:mb-4">
            <MessageSquareQuote className="h-4 w-4 text-primary-600" aria-hidden />
            <h2 className="text-sm font-semibold text-gray-900">What shoppers are saying</h2>
          </div>

          <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex flex-nowrap gap-3 pb-1 md:gap-4">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
