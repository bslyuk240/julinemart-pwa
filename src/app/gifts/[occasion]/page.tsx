import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import GiftsCatalog from '@/components/gifts/gifts-catalog';
import GiftAnalyticsBeacon from '@/components/gifts/gift-analytics-beacon';
import { GIFT_OCCASIONS, isGiftOccasionSlug, occasionMeta } from '@/lib/gifts/discovery';
import { fetchGiftBoxes } from '@/lib/jlo/gifts';

type Props = {
  params: Promise<{ occasion: string }>;
  searchParams: Promise<{ recipient?: string; budget?: string }>;
};

export function generateStaticParams() {
  return GIFT_OCCASIONS.map((o) => ({ occasion: o.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { occasion } = await params;
  const meta = occasionMeta(occasion);
  if (!meta) return { title: 'Gifts | JulineMart' };
  return {
    title: `${meta.label} Gifts — JulineMart`,
    description: meta.description,
  };
}

export default async function GiftsOccasionPage({ params, searchParams }: Props) {
  const { occasion } = await params;
  const sp = await searchParams;
  if (!isGiftOccasionSlug(occasion)) notFound();

  const meta = occasionMeta(occasion)!;
  const { boxes, gfc } = await fetchGiftBoxes('warri', {
    budget: sp.budget as import('@/lib/gifts/discovery').GiftBudgetSlug | undefined,
  });

  return (
    <>
      <GiftAnalyticsBeacon
        kind="landing"
        source="occasion_seo"
        occasion={occasion}
        boxCount={boxes.length}
      />
      <Suspense fallback={null}>
        <GiftsCatalog
          boxes={boxes}
          gfc={gfc}
          title={`${meta.label} gifts`}
          description={meta.description}
          lockedOccasion={occasion}
        />
      </Suspense>
    </>
  );
}
