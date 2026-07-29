import { Star, Quote, BadgeCheck } from 'lucide-react';
import type { CampaignReview } from '@/lib/campaigns/reviews';

// No scope tabs here (unlike the earlier design prototype) — the backend
// (BE-203) already resolves one scoped/fallback-tiered list server-side per
// the campaign's reviewRules, so there's nothing left to toggle client-side.
// Each review keeps its attribution label so a category/vendor review is
// never shown as if it were a specific product's review.
export default function ReviewsSection({ reviews }: { reviews: CampaignReview[] }) {
  if (!reviews.length) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-5 text-xs font-extrabold uppercase tracking-wide text-primary-600">
        What shoppers are saying
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <figure key={review.id} className="rounded-2xl bg-gray-50 p-5">
            <Quote className="mb-2 h-4 w-4 text-secondary-500 opacity-60" />
            <p className="mb-3 text-sm text-gray-800">&ldquo;{review.body}&rdquo;</p>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex gap-0.5 text-secondary-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3"
                    fill={i < review.rating ? 'currentColor' : 'none'}
                  />
                ))}
              </span>
              {review.verifiedPurchase && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <figcaption className="text-xs text-gray-500">
              {review.reviewerName} · {review.attribution.label}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
