import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import HomeSections from '@/components/home/home-sections';
import { getHomepageSectionsData } from '@/lib/homepage-sections';

export const revalidate = 300;

export default async function HomePage() {
  const sections = await getHomepageSectionsData();

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50">
      <section className="container-custom py-3 md:py-6">
        <HeroSlider />
      </section>

      <CategoryStrip />

      <HomeSections initialSections={sections} />

      <div className="h-20 md:h-8" />
    </main>
  );
}
