import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import TopSellers from '@/components/home/top-sellers';
import SponsoredProducts from '@/components/home/sponsored-products';
import LaunchingDeals from '@/components/home/launching-deals';
import { getProducts } from '@/lib/woocommerce/products';

// Simple fisher-yates shuffle so each render surfaces different items
function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  // Fetch each section individually with error logging
  let flashSaleProducts: any[] = [];
  let dealProducts: any[] = [];
  let trendingProducts: any[] = [];
  let topSellerProducts: any[] = [];
  let sponsoredProducts: any[] = [];
  let launchingProducts: any[] = [];

  try {
    flashSaleProducts = shuffle(await getProducts({ tag: 'flash-sale', per_page: 12 }));
  } catch (error) {
    console.error('Flash sale fetch failed:', error);
  }

  try {
    dealProducts = shuffle(await getProducts({ tag: 'deal', per_page: 12 }));
  } catch (error) {
    console.error('Deals fetch failed:', error);
  }

  try {
    trendingProducts = shuffle(await getProducts({ tag: 'best-seller', per_page: 12 }));
  } catch (error) {
    console.error('Best sellers fetch failed:', error);
  }

  try {
    topSellerProducts = shuffle(await getProducts({ tag: 'top-seller', per_page: 12 }));
  } catch (error) {
    console.error('Top sellers fetch failed:', error);
  }

  try {
    sponsoredProducts = shuffle(await getProducts({ tag: 'sponsored', per_page: 12 }));
  } catch (error) {
    console.error('Sponsored fetch failed:', error);
  }

  try {
    launchingProducts = shuffle(await getProducts({ tag: 'launching-deal', per_page: 12 }));
  } catch (error) {
    console.error('Launching deals fetch failed:', error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider */}
      <section className="container mx-auto px-4 py-3 md:py-6">
        <HeroSlider />
      </section>

      {/* Category Strip */}
      <CategoryStrip />

      {/* Flash Sales */}
      {flashSaleProducts.length > 0 && (
        <FlashSales products={flashSaleProducts} />
      )}

      {/* Launching Deals */}
      {launchingProducts.length > 0 && (
        <LaunchingDeals products={launchingProducts} />
      )}

      {/* Sponsored Products */}
      {sponsoredProducts.length > 0 && (
        <SponsoredProducts products={sponsoredProducts} />
      )}

      {/* Top Sellers */}
      {topSellerProducts.length > 0 && (
        <TopSellers products={topSellerProducts} />
      )}

      {/* Deals Section */}
      {dealProducts.length > 0 && (
        <DealsSection products={dealProducts} />
      )}

      {/* Trending/Best Sellers */}
      {trendingProducts.length > 0 && (
        <TrendingSection products={trendingProducts} />
      )}

      {/* Empty State - Show when no products with tags */}
      {flashSaleProducts.length === 0 && 
       dealProducts.length === 0 && 
       trendingProducts.length === 0 &&
       topSellerProducts.length === 0 &&
       sponsoredProducts.length === 0 &&
       launchingProducts.length === 0 && (
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-gray-600 mb-4">
            No featured products yet. Add tags to your products to display them here.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-sm text-blue-800 font-medium mb-2">
              How to add products to homepage sections:
            </p>
            <ul className="text-sm text-blue-700 text-left space-y-1">
              <li>• Tag products with "flash-sale" for Flash Sales section</li>
              <li>• Tag products with "deal" for Deals section</li>
              <li>• Tag products with "best-seller" for Trending section</li>
              <li>• Tag products with "top-seller" for Top Sellers section</li>
              <li>• Tag products with "sponsored" for Sponsored Products section</li>
              <li>• Tag products with "launching-deal" for Launching Deals section</li>
            </ul>
          </div>
        </div>
      )}

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-8" />
    </main>
  );
}
