import { getCategories } from '@/lib/woocommerce/categories';
import { getProducts } from '@/lib/woocommerce/products';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import type { Product } from '@/types/product';
import type { Category } from '@/types/category';

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

let categoriesCache: Promise<Category[]> | null = null;

async function getAllHomepageCategories(): Promise<Category[]> {
  if (!categoriesCache) {
    categoriesCache = getCategories({
      per_page: 100,
      hide_empty: false,
    }).catch((err) => {
      // Clear so the next request retries instead of reusing a failed promise
      categoriesCache = null;
      throw err;
    });
  }

  return categoriesCache;
}

function getDescendantCategoryIds(categories: Category[], rootCategoryId: number): number[] {
  const discovered = new Set<number>([rootCategoryId]);
  const queue = [rootCategoryId];

  while (queue.length > 0) {
    const parentId = queue.shift();
    if (!parentId) continue;

    const children = categories.filter((category) => category.parent === parentId);

    for (const child of children) {
      if (!discovered.has(child.id)) {
        discovered.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return Array.from(discovered);
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

async function getCategoryTreeProducts(categorySlug: string, limit: number = 18): Promise<Product[]> {
  const categories = await getAllHomepageCategories();
  const rootCategory = categories.find((category) => category.slug === categorySlug) || null;
  if (!rootCategory) {
    return [];
  }

  const categoryIds = getDescendantCategoryIds(categories, rootCategory.id);
  const rawProducts = await getProducts({
    category: categoryIds.join(','),
    per_page: 50,
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
    withTimeout(getCategoryTreeProducts('electronics'), 'Electronics products fetch', []),
    withTimeout(getCategoryTreeProducts('fashion-accessories'), 'Fashion products fetch', []),
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
