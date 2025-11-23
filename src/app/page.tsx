import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import { getProducts } from '@/lib/woocommerce/products';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  // Fetch ONLY products with specific tags - NO FALLBACKS
  const [flashSaleProducts, dealProducts, trendingProducts] = await Promise.all([
    getProducts({ tag: 'flash-sale', per_page: 8 }).catch(() => []),
    getProducts({ tag: 'deal', per_page: 8 }).catch(() => []),
    getProducts({ tag: 'best-seller', per_page: 8 }).catch(() => []), // Changed from 'featured'
  ]);

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider */}
      <section className="container mx-auto px-4 py-3 md:py-6">
        <HeroSlider />
      </section>

      {/* Category Strip */}
      <CategoryStrip />

      {/* Flash Sales - Only show if products exist */}
      {flashSaleProducts.length > 0 && (
        <FlashSales products={flashSaleProducts} />
      )}

      {/* Deals Section - Only show if products exist */}
      {dealProducts.length > 0 && (
        <DealsSection products={dealProducts} />
      )}

      {/* Trending/Best Sellers - Only show if products exist */}
      {trendingProducts.length > 0 && (
        <TrendingSection products={trendingProducts} />
      )}

      {/* Empty State - Show when no products with tags */}
      {flashSaleProducts.length === 0 && 
       dealProducts.length === 0 && 
       trendingProducts.length === 0 && (
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
            </ul>
          </div>
        </div>
      )}

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-8" />
    </main>
  );
}