import { getProducts } from '@/lib/woocommerce/products';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import type { Product } from '@/types/product';

const HOMEPAGE_FETCH_TIMEOUT_MS = 12000;

export interface HomepageSectionsData {
  flashSaleProducts: Product[];
  dealProducts: Product[];
  trendingProducts: Product[];
  topSellerProducts: Product[];
  sponsoredProducts: Product[];
  launchingProducts: Product[];
  electronicsProducts: Product[];
  fashionProducts: Product[];
}

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function withTimeout<T>(
  task: Promise<T>,
  label: string,
  fallback: T,
  timeoutMs: number = HOMEPAGE_FETCH_TIMEOUT_MS
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutHandle = setTimeout(() => {
      console.error(`${label} timed out after ${timeoutMs}ms`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutPromise]);
  } catch (error) {
    console.error(`${label} failed:`, error);
    return fallback;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function getHomepageTagProducts(tag: string, label: string): Promise<Product[]> {
  return withTimeout(
    (async () => {
      const rawProducts = await getProducts({ tag, per_page: 12 });
      const filteredProducts = await filterActiveVendorProducts(rawProducts);
      return shuffle(filteredProducts);
    })(),
    label,
    []
  );
}

// Pass the category slug directly to the catalog — no WC category ID lookup.
async function getCategoryProducts(categorySlug: string, limit: number = 18): Promise<Product[]> {
  const rawProducts = await getProducts({
    category: categorySlug,
    per_page: limit,
    orderby: 'date',
    order: 'desc',
  });
  const filteredProducts = await filterActiveVendorProducts(rawProducts);
  return filteredProducts.slice(0, limit);
}

export async function getHomepageSectionsData(): Promise<HomepageSectionsData> {
  const [
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    electronicsProducts,
    fashionProducts,
  ] = await Promise.all([
    getHomepageTagProducts('flash-sale', 'Flash sale fetch'),
    getHomepageTagProducts('deal', 'Deals fetch'),
    getHomepageTagProducts('best-seller', 'Best sellers fetch'),
    getHomepageTagProducts('top-seller', 'Top sellers fetch'),
    getHomepageTagProducts('sponsored', 'Sponsored fetch'),
    getHomepageTagProducts('launching-deal', 'Launching deals fetch'),
    withTimeout(getCategoryProducts('electronics'), 'Electronics products fetch', []),
    withTimeout(getCategoryProducts('fashion-accessories'), 'Fashion products fetch', []),
  ]);

  return {
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    electronicsProducts,
    fashionProducts,
  };
}
