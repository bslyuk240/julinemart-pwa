import { Suspense } from 'react';
import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import HomeSections from '@/components/home/home-sections';
import { MobileHomeRailSkeleton } from '@/components/home/mobile-home-rail';
import type { HeroAd } from '@/lib/home/pwa-settings';
import VendorStrip from '@/components/home/vendor-strip';
import ReviewsCarousel from '@/components/home/reviews-carousel';
import CampaignOffersStrip from '@/components/campaigns/CampaignOffersStrip';
import CampaignOffersPopup from '@/components/campaigns/CampaignOffersPopup';
import GiftsHomeSection from '@/components/home/gifts-home-section';
import { getHomepageSectionsData } from '@/lib/homepage-sections';
import { getActiveCampaignSummaries } from '@/lib/campaigns/get-campaign';
import { getPwaSettings, normalizeHeroAds, toHomeBanner } from '@/lib/home/pwa-settings';
import { HomeHelpLinks, HomePromoStrip, HomeTopBar } from '@/components/home/home-phone-chrome';

export const revalidate = 300; // Re-fetch product sections every 5 minutes

const CAMPAIGNS_ENABLED = process.env.FEATURE_CAMPAIGNS_ENABLED === 'true';

// HomeSectionsFetcher runs server-side so the full page (hero + sections)
// is pre-rendered with real product data. No client skeleton flash on first load.
async function HomeSectionsFetcher({ phoneAds }: { phoneAds: HeroAd[] }) {
  const sections = await getHomepageSectionsData();
  return <HomeSections initialSections={sections} phoneAds={phoneAds} />;
}

// Phones get the mobile tier (src/lib/mobile/mobile-tier-routes.ts): their own top bar,
// tonal sections and rails (max-md: / md:hidden), and the tab bar. Desktop is unchanged.
export default async function HomePage() {
  const [activeCampaigns, settings] = await Promise.all([
    CAMPAIGNS_ENABLED ? getActiveCampaignSummaries() : Promise.resolve([]),
    getPwaSettings(),
  ]);
  const heroAds = normalizeHeroAds(settings?.hero_ads);
  // The phone carousel plays both desktop panels' ads, once each.
  const phoneAds = [...heroAds.left, ...heroAds.right].filter(
    (ad, i, all) => all.findIndex((other) => (other.image_url || other.video_url) === (ad.image_url || ad.video_url)) === i,
  );

  return (
    // ConditionalChrome already wraps every page in <main>.
    <div className="min-h-screen overflow-x-hidden bg-gray-50 max-md:bg-m-surface">
      <HomeTopBar />

      <section className="container-custom py-3 max-md:pb-0 max-md:pt-1 md:py-6">
        <HeroSlider sliders={settings?.sliders} ads={heroAds} />
      </section>

      <CampaignOffersStrip campaigns={activeCampaigns} />

      {activeCampaigns.length > 0 && <CampaignOffersPopup campaigns={activeCampaigns} />}

      <HomePromoStrip banner={toHomeBanner(settings?.banner)} />

      <CategoryStrip />

      <GiftsHomeSection />

      <Suspense fallback={
        <>
        <MobileHomeRailSkeleton />
        <div className="space-y-2 max-md:hidden">
          {[...Array(3)].map((_, i) => (
            <section key={i} className="py-3 md:py-8 bg-white">
              <div className="container-custom">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
                  <div className="h-5 w-36 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="flex gap-3 md:gap-4 overflow-hidden">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="flex-shrink-0 w-36 md:w-44 rounded-xl bg-gray-100 animate-pulse">
                      <div className="aspect-square rounded-t-xl bg-gray-200" />
                      <div className="p-2 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-3/4" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
        </>
      }>
        <HomeSectionsFetcher phoneAds={phoneAds} />
      </Suspense>

      <Suspense fallback={null}>
        <VendorStrip />
      </Suspense>

      <Suspense fallback={null}>
        <ReviewsCarousel />
      </Suspense>

      <HomeHelpLinks />

      <div className="h-4 md:h-2" />
    </div>
  );
}
