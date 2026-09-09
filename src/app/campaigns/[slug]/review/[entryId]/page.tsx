import ReviewComposer from '@/components/campaigns/ReviewComposer';

// Deliberately thin — all the real logic (does this entry exist, has it
// already been reviewed) lives behind the /api/giveaways/review-context
// proxy so it can be rate-limited server-side the same way validate-code and
// enter already are, not duplicated here. No login required: the entryId in
// the URL (a giveaway_entries.id, already an unguessable uuid) is the access
// control — see JLO's giveaway-get-review-context.js.
export default async function GiveawayReviewPage({
  params,
}: {
  params: Promise<{ slug: string; entryId: string }>;
}) {
  const { entryId } = await params;
  return <ReviewComposer entryId={entryId} />;
}
