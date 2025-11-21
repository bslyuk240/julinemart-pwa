import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import { getProducts } from '@/lib/woocommerce/products';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  // Fetch products in parallel for better performance
  const [flashSaleProducts, dealProducts, trendingProducts] = await Promise.all([
    getProducts({ tag: 'flash-sale', per_page: 10 }).catch(() => []),
    getProducts({ tag: 'deal', per_page: 10 }).catch(() => []),
    getProducts({ featured: true, per_page: 10 }).catch(() => []),
  ]);

  // Fallback: if no products with tags, get latest products
  const productsToShow = {
    flash: flashSaleProducts.length > 0 ? flashSaleProducts : await getProducts({ per_page: 10, orderby: 'date' }).catch(() => []),
    deals: dealProducts.length > 0 ? dealProducts : await getProducts({ per_page: 10, orderby: 'popularity' }).catch(() => []),
    trending: trendingProducts.length > 0 ? trendingProducts : await getProducts({ per_page: 10, orderby: 'rating' }).catch(() => []),
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Slider */}
      <section className="container mx-auto px-4 py-6">
        <HeroSlider />
      </section>

      {/* Category Strip */}
      <CategoryStrip />

      {/* Flash Sales */}
      <FlashSales products={productsToShow.flash} />

      {/* Deals Section */}
      <DealsSection products={productsToShow.deals} />

      {/* Trending Products */}
      <TrendingSection products={productsToShow.trending} />

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-8" />
    </main>
  );
}