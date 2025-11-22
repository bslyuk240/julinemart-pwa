import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import { getProducts } from '@/lib/woocommerce/products';
import { dummyProducts, getFeaturedProducts, getProductsByTag } from '@/lib/dummy-data';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  // Fetch products in parallel for better performance
  const [flashSaleProducts, dealProducts, trendingProducts] = await Promise.all([
    getProducts({ tag: 'flash-sale', per_page: 8 }).catch(() => []),
    getProducts({ tag: 'deal', per_page: 8 }).catch(() => []),
    getProducts({ featured: true, per_page: 8 }).catch(() => []),
  ]);

  // Fallback: if no products with tags, get latest products
  const productsToShow = {
    flash: flashSaleProducts.length > 0
      ? flashSaleProducts
      : (await getProducts({ per_page: 8, orderby: 'date' }).catch(() => [])) || [],
    deals: dealProducts.length > 0
      ? dealProducts
      : (await getProducts({ per_page: 8, orderby: 'popularity' }).catch(() => [])) || [],
    trending: trendingProducts.length > 0
      ? trendingProducts
      : (await getProducts({ per_page: 8, orderby: 'rating' }).catch(() => [])) || [],
  };

  // Last-resort fallback to dummy data so home sections never render empty
  const ensureProducts = (list: any[], fallback: any[]) =>
    list && list.length > 0 ? list : fallback;

  const flashFallback = ensureProducts(
    productsToShow.flash,
    getProductsByTag('flash-sale').length ? getProductsByTag('flash-sale') : dummyProducts
  );

  const dealsFallback = ensureProducts(
    productsToShow.deals,
    getProductsByTag('deal').length ? getProductsByTag('deal') : dummyProducts
  );

  const trendingFallback = ensureProducts(
    productsToShow.trending,
    getFeaturedProducts().length ? getFeaturedProducts() : dummyProducts
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider - Compact on mobile, normal on desktop */}
      <section className="container mx-auto px-4 py-3 md:py-6">
        <HeroSlider />
      </section>

      {/* Category Strip - No spacing on mobile, normal on desktop */}
      <CategoryStrip />

      {/* Flash Sales - Sections have their own responsive spacing */}
      <FlashSales products={flashFallback} />

      {/* Deals Section */}
      <DealsSection products={dealsFallback} />

      {/* Trending Products */}
      <TrendingSection products={trendingFallback} />

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-8" />
    </main>
  );
}
