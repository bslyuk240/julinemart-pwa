export type GiftBoxReview = {
  id: string;
  date_created: string;
  review: string;
  rating: number;
  reviewer: string;
  verified: boolean;
  status: string;
};

export async function getGiftBoxReviews(params: { giftBoxId?: string; slug?: string }): Promise<GiftBoxReview[]> {
  const qs = new URLSearchParams();
  if (params.giftBoxId) qs.set('gift_box_id', params.giftBoxId);
  if (params.slug) qs.set('slug', params.slug);
  if (!params.giftBoxId && !params.slug) return [];

  try {
    const res = await fetch(`/api/gifts/box-reviews?${qs}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { reviews?: GiftBoxReview[] };
    return data.reviews ?? [];
  } catch {
    return [];
  }
}

export async function createGiftBoxReview(payload: {
  gift_box_id?: string;
  slug?: string;
  review: string;
  reviewer: string;
  reviewer_email: string;
  rating: number;
}): Promise<{ review?: GiftBoxReview; error?: string }> {
  try {
    const res = await fetch('/api/gifts/box-reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { review?: GiftBoxReview; error?: string };
    if (!res.ok) return { error: data.error || 'Failed to submit review' };
    return { review: data.review };
  } catch {
    return { error: 'Failed to submit review' };
  }
}
