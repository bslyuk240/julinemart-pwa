import HeroSlider from '@/components/home/hero-slider';
import CategoryStrip from '@/components/home/category-strip';
import FlashSales from '@/components/home/flash-sales';
import DealsSection from '@/components/home/deals-section';
import TrendingSection from '@/components/home/trending-section';
import TopSellers from '@/components/home/top-sellers';
import SponsoredProducts from '@/components/home/sponsored-products';
import LaunchingDeals from '@/components/home/launching-deals';
import CategoryProductsSection from '@/components/home/category-products-section';
import { getCategoryBySlug, getSubcategories } from '@/lib/woocommerce/categories';
import { getProducts, getProductsByCategory } from '@/lib/woocommerce/products';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import type { Product } from '@/types/product';

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const revalidate = 300;

async function getDescendantCategoryIds(rootCategoryId: number): Promise<number[]> {
  const discovered = new Set<number>([rootCategoryId]);
  const queue = [rootCategoryId];

  while (queue.length > 0) {
    const parentId = queue.shift();
    if (!parentId) continue;

    const children = await getSubcategories(parentId, 100);

    for (const child of children) {
      if (!discovered.has(child.id)) {
        discovered.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return Array.from(discovered);
}

async function getCategoryTreeProducts(categorySlug: string, limit: number = 18): Promise<Product[]> {
  const rootCategory = await getCategoryBySlug(categorySlug);
  if (!rootCategory) {
    return [];
  }

  const categoryIds = await getDescendantCategoryIds(rootCategory.id);
  const productGroups = await Promise.all(
    categoryIds.map((categoryId) =>
      getProductsByCategory(categoryId, {
        per_page: 24,
        orderby: 'date',
        order: 'desc',
      })
    )
  );

  const mergedProducts = productGroups.flat();
  const dedupedProducts = Array.from(
    new Map(mergedProducts.map((product) => [product.id, product])).values()
  );
  const filteredProducts = await filterActiveVendorProducts(dedupedProducts);

  return filteredProducts.slice(0, limit);
}

export default async function HomePage() {
  let flashSaleProducts: Product[] = [];
  let dealProducts: Product[] = [];
  let trendingProducts: Product[] = [];
  let topSellerProducts: Product[] = [];
  let sponsoredProducts: Product[] = [];
  let launchingProducts: Product[] = [];
  let electronicsProducts: Product[] = [];
  let fashionProducts: Product[] = [];

  try {
    const rawProducts = await getProducts({ tag: 'flash-sale', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    flashSaleProducts = shuffle(filtered);
  } catch (error) {
    console.error('Flash sale fetch failed:', error);
  }

  try {
    const rawProducts = await getProducts({ tag: 'deal', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    dealProducts = shuffle(filtered);
  } catch (error) {
    console.error('Deals fetch failed:', error);
  }

  try {
    const rawProducts = await getProducts({ tag: 'best-seller', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    trendingProducts = shuffle(filtered);
  } catch (error) {
    console.error('Best sellers fetch failed:', error);
  }

  try {
    const rawProducts = await getProducts({ tag: 'top-seller', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    topSellerProducts = shuffle(filtered);
  } catch (error) {
    console.error('Top sellers fetch failed:', error);
  }

  try {
    const rawProducts = await getProducts({ tag: 'sponsored', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    sponsoredProducts = shuffle(filtered);
  } catch (error) {
    console.error('Sponsored fetch failed:', error);
  }

  try {
    const rawProducts = await getProducts({ tag: 'launching-deal', per_page: 12 });
    const filtered = await filterActiveVendorProducts(rawProducts);
    launchingProducts = shuffle(filtered);
  } catch (error) {
    console.error('Launching deals fetch failed:', error);
  }

  try {
    electronicsProducts = await getCategoryTreeProducts('electronics');
  } catch (error) {
    console.error('Electronics products fetch failed:', error);
  }

  try {
    fashionProducts = await getCategoryTreeProducts('fashion-accessories');
  } catch (error) {
    console.error('Fashion products fetch failed:', error);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="container mx-auto px-4 py-3 md:py-6">
        <HeroSlider />
      </section>

      <CategoryStrip />

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
          <div className="container mx-auto px-4 py-12 text-center">
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

      <div className="h-20 md:h-8" />
    </main>
  );
}
