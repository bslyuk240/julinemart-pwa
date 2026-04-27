'use client';

import { useEffect, useState } from 'react';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import TopSellers from '@/components/home/top-sellers';
import SponsoredProducts from '@/components/home/sponsored-products';
import LaunchingDeals from '@/components/home/launching-deals';
import CategoryProductsSection from '@/components/home/category-products-section';
import type { HomepageSectionsData } from '@/lib/homepage-sections';

interface HomeSectionsProps {
  initialSections: HomepageSectionsData;
}

const EMPTY_SECTIONS: HomepageSectionsData = {
  flashSaleProducts: [],
  dealProducts: [],
  trendingProducts: [],
  topSellerProducts: [],
  sponsoredProducts: [],
  launchingProducts: [],
  electronicsProducts: [],
  fashionProducts: [],
};

const CACHE_KEY = 'homepage_sections_v1';
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
  return Object.values(sections).some((arr) => arr.length > 0);
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

export default function HomeSections({ initialSections }: HomeSectionsProps) {
  // Seed from cache immediately so returning visitors see data on first paint
  const [sections, setSections] = useState<HomepageSectionsData>(() => {
    if (hasData(initialSections || EMPTY_SECTIONS)) return initialSections;
    if (typeof window !== 'undefined') {
      const cached = readCache();
      if (cached && hasData(cached)) return cached;
    }
    return EMPTY_SECTIONS;
  });

  const [loading, setLoading] = useState(() => !hasData(sections));

  useEffect(() => {
    let cancelled = false;

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
  }, []);

  const {
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    electronicsProducts,
    fashionProducts,
  } = sections;

  // Still waiting for first-ever fetch and nothing in cache
  if (loading) {
    return (
      <>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </>
    );
  }

  return (
    <>
      {flashSaleProducts.length > 0 && <FlashSales products={flashSaleProducts} />}

      {launchingProducts.length > 0 && <LaunchingDeals products={launchingProducts} />}

      {sponsoredProducts.length > 0 && (
        <SponsoredProducts products={sponsoredProducts} />
      )}

      {topSellerProducts.length > 0 && <TopSellers products={topSellerProducts} />}

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

      {!hasData(sections) && (
        <div className="container-custom py-12 text-center">
          <p className="mb-4 text-gray-600">
            No featured products yet. Add tags to your products to display them here.
          </p>
          <div className="mx-auto max-w-2xl rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-sm font-medium text-blue-800">
              How to add products to homepage sections:
            </p>
            <ul className="space-y-1 text-left text-sm text-blue-700">
              <li>&bull; Tag products with &quot;flash-sale&quot; for Flash Sales section</li>
              <li>&bull; Tag products with &quot;deal&quot; for Deals section</li>
              <li>&bull; Tag products with &quot;best-seller&quot; for Trending section</li>
              <li>&bull; Tag products with &quot;top-seller&quot; for Top Sellers section</li>
              <li>&bull; Tag products with &quot;sponsored&quot; for Sponsored Products section</li>
              <li>&bull; Tag products with &quot;launching-deal&quot; for Launching Deals section</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
