'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import TopSellers from '@/components/home/top-sellers';
import SponsoredProducts from '@/components/home/sponsored-products';
import LaunchingDeals from '@/components/home/launching-deals';
import LocalMakersSection from '@/components/home/local-makers-section';
import CategoryProductsSection from '@/components/home/category-products-section';
import type { HomepageSectionsData } from '@/lib/homepage-sections';
import GenericProductSection from '@/components/home/generic-product-section';
import MobileHomeRail, { MobileHomeRailSkeleton } from '@/components/home/mobile-home-rail';
import HomeAdCarousel from '@/components/home/home-ad-carousel';
import type { HeroAd } from '@/lib/home/pwa-settings';

interface HomeSectionsProps {
  initialSections: HomepageSectionsData;
  /** Every desktop side-panel ad; phones show them mid-page in one small carousel. */
  phoneAds?: HeroAd[];
}

const EMPTY_SECTIONS: HomepageSectionsData = {
  flashSaleProducts: [],
  dealProducts: [],
  trendingProducts: [],
  topSellerProducts: [],
  sponsoredProducts: [],
  launchingProducts: [],
  localMakersProducts: [],
  electronicsProducts: [],
  fashionProducts: [],
  extraSections: [],
};

const CACHE_KEY = 'homepage_sections_v2';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function readCache(): HomepageSectionsData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: HomepageSectionsData; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) return null; // expired
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: HomepageSectionsData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // storage full or disabled — silently ignore
  }
}

function hasData(sections: HomepageSectionsData) {
  const { extraSections, ...fixed } = sections;
  return Object.values(fixed).some((arr) => arr.length > 0) || extraSections.length > 0;
}

// Skeleton for a single horizontal product section
function SectionSkeleton() {
  return (
    <section className="py-3 md:py-8 bg-white">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-200 animate-pulse" />
            <div>
              <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-1" />
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-14 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-36 md:w-44 rounded-xl bg-gray-100 animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="aspect-square rounded-t-xl bg-gray-200" />
              <div className="p-2 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomeSections({ initialSections, phoneAds = [] }: HomeSectionsProps) {
  // Hydration-safe: SSR and first client render must agree. Reading localStorage
  // inside useState() breaks that (server = skeletons, client = cached products → #418).
  const initialFromServer = initialSections ?? EMPTY_SECTIONS;
  const serverHasData = hasData(initialFromServer);

  const [sections, setSections] = useState<HomepageSectionsData>(() =>
    serverHasData ? initialFromServer : EMPTY_SECTIONS,
  );

  const [loading, setLoading] = useState(() => !serverHasData);

  useEffect(() => {
    let cancelled = false;

    if (!serverHasData) {
      const cached = readCache();
      if (cached && hasData(cached)) {
        setSections(cached);
        setLoading(false);
      }
    }

    const refresh = async () => {
      try {
        const res = await fetch('/api/homepage-sections');
        if (!res.ok) return;
        const data = (await res.json()) as HomepageSectionsData;
        if (!cancelled && hasData(data)) {
          writeCache(data);
          setSections(data);
        }
      } catch {
        // network error — keep whatever we have
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refresh();
    return () => { cancelled = true; };
  }, [serverHasData]);

  const {
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    localMakersProducts,
    electronicsProducts,
    fashionProducts,
    extraSections,
  } = sections;

  // Still waiting for first-ever fetch and nothing in cache
  if (loading) {
    return (
      <>
        <div className="max-md:hidden">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
        <MobileHomeRailSkeleton />
        <MobileHomeRailSkeleton />
      </>
    );
  }

  return (
    <>
      {/* Desktop and tablet: today's sections. */}
      <div className="max-md:hidden">
        {flashSaleProducts.length > 0 && <FlashSales products={flashSaleProducts} />}

        {launchingProducts.length > 0 && <LaunchingDeals products={launchingProducts} />}

        {sponsoredProducts.length > 0 && (
          <SponsoredProducts products={sponsoredProducts} />
        )}

        {topSellerProducts.length > 0 && <TopSellers products={topSellerProducts} />}

        {localMakersProducts.length > 0 && (
          <LocalMakersSection products={localMakersProducts} />
        )}

        {dealProducts.length > 0 && <DealsSection products={dealProducts} />}

        {trendingProducts.length > 0 && <TrendingSection products={trendingProducts} />}

        {electronicsProducts.length > 0 && (
          <CategoryProductsSection
            products={electronicsProducts}
            title="Electronics"
            subtitle="Shop electronics"
            href="/category/electronics"
            sectionClassName="bg-gradient-to-br from-blue-50 via-cyan-50 to-white"
            accentClassName="bg-gradient-to-br from-blue-600 to-cyan-500"
            linkClassName="text-blue-600 hover:text-blue-700"
          />
        )}

        {fashionProducts.length > 0 && (
          <CategoryProductsSection
            products={fashionProducts}
            title="Fashion & Accessories"
            subtitle="Shop fashion"
            href="/category/fashion-accessories"
            sectionClassName="bg-gradient-to-br from-rose-50 via-pink-50 to-white"
            accentClassName="bg-gradient-to-br from-rose-600 to-pink-500"
            linkClassName="text-rose-600 hover:text-rose-700"
          />
        )}

        {(extraSections ?? []).map((s) =>
          s.products.length > 0 ? (
            <GenericProductSection key={s.key} title={s.title} products={s.products} />
          ) : null
        )}
      </div>

      {/* Phones (mobile tier): the same rows as sideways rails, with the side-panel ads mid-page. */}
      <MobileHomeRail title="Flash sale" href="/products?tag=flash-sale" products={flashSaleProducts} cue="flash" />
      <MobileHomeRail title="Launching deals" href="/products?tag=launching-deal" products={launchingProducts} tag="new" />
      <MobileHomeRail title="Sponsored" href="/products?tag=sponsored" products={sponsoredProducts} />
      <MobileHomeRail title="Local makers" href="/products?tag=handmade" products={localMakersProducts} />
      <MobileHomeRail title="Today's deals" href="/products?tag=deal" products={dealProducts} cue="deals" />
      <HomeAdCarousel ads={phoneAds} />
      {/* Top sellers is merged into Best sellers (owner, 2026-10-25), so phones show them in one ranked row. */}
      <MobileHomeRail
        title="Trending now"
        href="/products?tag=best-seller"
        products={[...trendingProducts, ...topSellerProducts].filter(
          (p, i, all) => all.findIndex((other) => other.id === p.id) === i,
        )}
        tag="rank"
      />
      <MobileHomeRail title="Electronics" href="/category/electronics" products={electronicsProducts} />
      <MobileHomeRail title="Fashion & accessories" href="/category/fashion-accessories" products={fashionProducts} />
      {(extraSections ?? []).map((s) => (
        <MobileHomeRail key={s.key} title={s.title} products={s.products} />
      ))}

      {/* Nothing tagged yet (or every fetch failed): a quiet line, not admin instructions. */}
      {!hasData(sections) && (
        <div className="container-custom py-12 text-center max-md:px-4 max-md:py-8">
          <p className="mb-4 text-gray-600 max-md:text-m-body-m max-md:text-m-on-surface-variant">
            New products are on their way. In the meantime, browse everything in the shop.
          </p>
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-lg bg-primary-600 px-5 text-sm font-semibold text-white hover:bg-primary-700 max-md:h-12 max-md:rounded-full max-md:bg-m-primary max-md:text-m-label-l"
          >
            Browse all products
          </Link>
        </div>
      )}
    </>
  );
}
