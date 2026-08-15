import { Suspense } from 'react';
import GiftsCatalog from '@/components/gifts/gifts-catalog';
import GiftAnalyticsBeacon from '@/components/gifts/gift-analytics-beacon';
import { fetchGiftBoxes } from '@/lib/jlo/gifts';
import type { GiftBudgetSlug } from '@/lib/gifts/discovery';

export const metadata = {
  title: 'Gifts — JulineMart',
  description:
    'Curated gift boxes and build-your-own — filter by occasion, recipient, and budget.',
};

type Props = {
  searchParams: Promise<{ occasion?: string; recipient?: string; budget?: string }>;
};

export default async function GiftsLandingPage({ searchParams }: Props) {
  const sp = await searchParams;
  // Fetch all boxes; occasion/recipient filtering is client-side for section browse.
  const { boxes, gfc } = await fetchGiftBoxes('warri', {
    budget: sp.budget as GiftBudgetSlug | undefined,
  });

  return (
    <>
      <GiftAnalyticsBeacon kind="landing" source="gifts_landing" boxCount={boxes.length} />
      <Suspense fallback={null}>
        <GiftsCatalog boxes={boxes} gfc={gfc} />
      </Suspense>
    </>
  );
}
