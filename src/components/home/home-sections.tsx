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

function hasAnyMissingSections(sections: HomepageSectionsData) {
  return Object.values(sections).some((products) => products.length === 0);
}

export default function HomeSections({ initialSections }: HomeSectionsProps) {
  const [sections, setSections] = useState<HomepageSectionsData>(
    initialSections || EMPTY_SECTIONS
  );
  useEffect(() => {
    if (!hasAnyMissingSections(initialSections)) {
      return;
    }

    let cancelled = false;

    const refreshSections = async () => {
      try {
        const response = await fetch('/api/homepage-sections', {
          cache: 'no-store',
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as HomepageSectionsData;

        if (!cancelled) {
          // Merge: keep existing data for any section the API returned empty
          setSections((prev) => {
            const merged: HomepageSectionsData = { ...prev };
            (Object.keys(data) as (keyof HomepageSectionsData)[]).forEach((key) => {
              if (data[key].length > 0) {
                merged[key] = data[key];
              }
            });
            return merged;
          });
        }
      } catch (error) {
        console.error('Failed to refresh homepage sections:', error);
      }
    };

    refreshSections();

    return () => {
      cancelled = true;
    };
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

      {flashSaleProducts.length === 0 &&
        dealProducts.length === 0 &&
        trendingProducts.length === 0 &&
        topSellerProducts.length === 0 &&
        sponsoredProducts.length === 0 &&
        launchingProducts.length === 0 &&
        electronicsProducts.length === 0 &&
        fashionProducts.length === 0 && (
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
