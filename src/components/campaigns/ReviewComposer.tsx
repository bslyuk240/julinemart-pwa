'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

type Phase = 'loading' | 'ready' | 'already-reviewed' | 'not-found' | 'submitted' | 'error';

export default function ReviewComposer({ entryId }: { entryId: string }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [firstName, setFirstName] = useState('');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/giveaways/review-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entryId }),
        });
        const json = await res.json();
        if (!res.ok || !json?.success) {
          setPhase('not-found');
          return;
        }
        if (json.data.alreadyReviewed) {
          setPhase('already-reviewed');
          return;
        }
        setFirstName(json.data.firstName || '');
        setReviewerName(json.data.firstName || '');
        setCampaignTitle(json.data.campaignTitle || '');
        setPhase('ready');
      } catch {
        setPhase('error');
      }
    })();
  }, [entryId]);

  async function handleSubmit() {
    setFormError(null);
    if (rating === 0) {
      setFormError('Pick a star rating');
      return;
    }
    if (body.trim().length < 10) {
      setFormError('Tell us a little more — at least 10 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/giveaways/submit-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, rating, body: body.trim(), reviewerName: reviewerName.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        if (json?.error === 'already_reviewed') {
          setPhase('already-reviewed');
          return;
        }
        setFormError(json?.error || 'Something went wrong — please try again.');
        return;
      }
      setPhase('submitted');
    } catch {
      setFormError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (phase === 'not-found' || phase === 'error') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-lg font-extrabold text-gray-900">Link not found</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          This review link looks invalid or has expired. If you followed a link from WhatsApp, try copying it again.
        </p>
      </div>
    );
  }

  if (phase === 'already-reviewed') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="text-3xl">🙏</div>
        <h1 className="mt-3 text-lg font-extrabold text-gray-900">You've already told us!</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">Thanks again for your feedback — we've already got it.</p>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <div className="text-3xl">🎉</div>
        <h1 className="mt-3 text-lg font-extrabold text-gray-900">Thanks{firstName ? `, ${firstName}` : ''}!</h1>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          Your feedback is in. Once our team reviews it, it may show up on the JulineMart homepage.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-xl font-extrabold text-gray-900">
        Hi {firstName || 'there'}, how was {campaignTitle || 'the Secret Drop'}?
      </h1>
      <p className="mt-1 text-sm text-gray-500">Your feedback helps other JulineMart customers — and might get featured on our homepage.</p>

      <div className="mt-6 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-1"
          >
            <Star
              className={`h-9 w-9 ${(hoverRating || rating) >= n ? 'fill-amber-400 text-amber-400' : 'fill-gray-100 text-gray-300'}`}
            />
          </button>
        ))}
      </div>

      <div className="mt-5">
        <label className="text-xs font-medium text-gray-600">Your name (shown with your review)</label>
        <input
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          maxLength={120}
        />
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-gray-600">Your review</label>
        <textarea
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Tell us what you enjoyed about the giveaway..."
        />
      </div>

      {formError && <p className="mt-2 text-sm font-medium text-red-600">{formError}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-5 block min-h-[48px] w-full rounded-full bg-purple-600 px-6 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send my review'}
      </button>
    </div>
  );
}
