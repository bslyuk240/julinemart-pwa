import { getCategoryBySlug, getSubcategories } from '@/lib/woocommerce/categories';
import { getProducts, getProductsByCategory } from '@/lib/woocommerce/products';
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
