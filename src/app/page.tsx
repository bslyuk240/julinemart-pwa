import { Suspense } from 'react';
import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import HomeSections from '@/components/home/home-sections';

export const revalidate = 300;

// EMPTY_SECTIONS matches HomepageSectionsData — all arrays start empty so
// HomeSections detects missing data and fetches /api/homepage-sections
// client-side.  The page shell (hero + categories) renders immediately.
const EMPTY_SECTIONS = {
  flashSaleProducts: [],
  dealProducts: [],
  trendingProducts: [],
  topSellerProducts: [],
  sponsoredProducts: [],
  launchingProducts: [],
  electronicsProducts: [],
  fashionProducts: [],
} as const;

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50">
      <section className="container-custom py-3 md:py-6">
        <HeroSlider />
      </section>

      <CategoryStrip />

      <Suspense fallback={null}>
        <HomeSections initialSections={EMPTY_SECTIONS as any} />
      </Suspense>

      <div className="h-20 md:h-8" />
    </main>
  );
}
