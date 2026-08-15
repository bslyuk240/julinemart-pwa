'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getGiftBoxReviews, createGiftBoxReview, type GiftBoxReview } from '@/lib/gifts/reviews';

type Props = {
  giftBoxId: string;
  slug: string;
  description: string | null;
  averageRating?: number;
  ratingCount?: number;
};

export default function GiftBoxReviewTabs({ giftBoxId, slug, description, averageRating = 0, ratingCount = 0 }: Props) {
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [reviews, setReviews] = useState<GiftBoxReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ reviewer: '', reviewerEmail: '', rating: 0, review: '' });

  useEffect(() => {
    let cancelled = false;
    setLoadingReviews(true);
    getGiftBoxReviews({ giftBoxId, slug }).then((data) => {
      if (!cancelled) {
        setReviews(data);
        setLoadingReviews(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [giftBoxId, slug]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.reviewer.trim() || !form.reviewerEmail.trim() || !form.review.trim() || form.rating < 1) {
      toast.error('Please provide your name, email, rating, and review.');
      return;
    }

    setSubmitting(true);
    try {
      const { review, error } = await createGiftBoxReview({
        gift_box_id: giftBoxId,
        slug,
        review: form.review.trim(),
        reviewer: form.reviewer.trim(),
        reviewer_email: form.reviewerEmail.trim(),
        rating: form.rating,
      });

      if (review) {
        toast.success('Review submitted! It will appear once approved.');
        setForm((prev) => ({ reviewer: prev.reviewer, reviewerEmail: prev.reviewerEmail, rating: 0, review: '' }));
      } else {
        toast.error(error || 'Failed to submit review');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t pt-8 mt-8">
      <div className="flex gap-4 md:gap-8 border-b mb-6 overflow-x-auto pb-1 md:overflow-visible">
        <button
          type="button"
          onClick={() => setActiveTab('description')}
          className={`pb-3 font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'description'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Description
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 font-semibold whitespace-nowrap transition-colors ${
            activeTab === 'reviews'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Reviews ({ratingCount})
        </button>
      </div>

      {activeTab === 'description' && (
        <div className="prose max-w-none">
          {description ? (
            <p className="whitespace-pre-line text-sm md:text-base text-gray-700 leading-relaxed">
              {description}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No description provided for this gift box yet.</p>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-4">
            {ratingCount > 0 && (
              <div className="flex items-center gap-2 pb-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(averageRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {averageRating.toFixed(1)} out of 5 ({ratingCount} review{ratingCount === 1 ? '' : 's'})
                </span>
              </div>
            )}
            {loadingReviews ? (
              <div className="flex items-center justify-center py-12 text-gray-600">
                <div className="animate-spin w-6 h-6 border-4 border-primary-600 border-t-transparent rounded-full mr-3" />
                Loading reviews...
              </div>
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <div key={review.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{review.reviewer}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(review.date_created).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{review.review}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-600 border border-dashed border-gray-200 rounded-lg">
                <p className="font-medium">No reviews yet.</p>
                <p className="text-sm text-gray-500">Be the first to share your thoughts on this gift box.</p>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Write a review</h3>
              <p className="text-sm text-gray-600 mb-4">Share your experience with this gift box.</p>

              <form className="space-y-3" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Your rating</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, rating }))}
                        className="p-1"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            form.rating >= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={form.reviewer}
                      onChange={(e) => setForm((prev) => ({ ...prev, reviewer: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={form.reviewerEmail}
                      onChange={(e) => setForm((prev) => ({ ...prev, reviewerEmail: e.target.value }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Review</label>
                  <textarea
                    value={form.review}
                    onChange={(e) => setForm((prev) => ({ ...prev, review: e.target.value }))}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 resize-none"
                    placeholder="Tell others what you thought of this gift box"
                  />
                </div>

                <Button type="submit" variant="primary" size="sm" fullWidth disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
