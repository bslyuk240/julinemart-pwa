import { getProducts } from '@/lib/woocommerce/products';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { PRODUCT_TAGS } from '@/lib/constants';
import type { Product } from '@/types/product';

const HOMEPAGE_FETCH_TIMEOUT_MS = 12000;

export interface ExtraSection {
  key: string;
  title: string;
  products: Product[];
}

export interface HomepageSectionsData {
  flashSaleProducts: Product[];
  dealProducts: Product[];
  trendingProducts: Product[];
  topSellerProducts: Product[];
  sponsoredProducts: Product[];
  launchingProducts: Product[];
  localMakersProducts: Product[];
  electronicsProducts: Product[];
  fashionProducts: Product[];
  extraSections: ExtraSection[];
}

// Keys that map to the 8 hardcoded sections — anything else is an "extra"
const KNOWN_SECTION_KEYS = new Set([
  'flash_sale',
  'deals',
  'best_sellers',
  'top_sellers',
  'sponsored',
  'launching_deals',
  'electronics',
  'fashion',
]);

interface SupabaseSectionRow {
  key: string;
  content: {
    title?: string;
    tag_slug?: string;
    category_slug?: string;
    display_limit?: number;
  };
  is_active: boolean;
}

// Returns overrides from Supabase for known sections + any extra section rows
async function fetchSectionConfigs(): Promise<{
  overrides: Map<string, SupabaseSectionRow['content']>;
  extras: SupabaseSectionRow[];
}> {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('homepage_content')
      .select('key, content, is_active')
      .eq('type', 'section')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data) return { overrides: new Map(), extras: [] };

    const overrides = new Map<string, SupabaseSectionRow['content']>();
    const extras: SupabaseSectionRow[] = [];

    for (const row of data as SupabaseSectionRow[]) {
      if (KNOWN_SECTION_KEYS.has(row.key)) {
        overrides.set(row.key, row.content);
      } else {
        extras.push(row);
      }
    }

    return { overrides, extras };
  } catch {
    return { overrides: new Map(), extras: [] };
  }
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

function dedupeProducts(products: Product[]): Product[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = product.slug || String(product.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getLocalMakersProducts(): Promise<Product[]> {
  return withTimeout(
    (async () => {
      const [handmade, madeInNigeria, customisable] = await Promise.all([
        getProducts({ tag: PRODUCT_TAGS.HANDMADE, per_page: 12 }),
        getProducts({ tag: PRODUCT_TAGS.MADE_IN_NIGERIA, per_page: 12 }),
        getProducts({ tag: PRODUCT_TAGS.CUSTOMISABLE, per_page: 8 }),
      ]);
      const merged = dedupeProducts([...handmade, ...madeInNigeria, ...customisable]);
      const filtered = await filterActiveVendorProducts(merged);
      return shuffle(filtered).slice(0, 12);
    })(),
    'Local makers fetch',
    []
  );
}

// JLO catalog-products filters by category slug server-side (max 100 per page).
async function getCategoryProducts(categorySlug: string, limit: number = 18): Promise<Product[]> {
  const rawProducts = await getProducts({
    category: categorySlug,
    per_page: 100,
    orderby: 'date',
    order: 'desc',
  });
  const vendorFiltered = await filterActiveVendorProducts(rawProducts);
  return vendorFiltered.slice(0, limit);
}

export async function getHomepageSectionsData(): Promise<HomepageSectionsData> {
  const { overrides, extras } = await fetchSectionConfigs();

  // Helper: pick tag from Supabase override or fall back to hardcoded default
  const tag = (key: string, defaultSlug: string) =>
    overrides.get(key)?.tag_slug || defaultSlug;
  const cat = (key: string, defaultSlug: string) =>
    overrides.get(key)?.category_slug || defaultSlug;
  const limit = (key: string, defaultLimit: number) =>
    overrides.get(key)?.display_limit || defaultLimit;

  const [
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    localMakersProducts,
    electronicsProducts,
    fashionProducts,
    ...extraResults
  ] = await Promise.all([
    getHomepageTagProducts(tag('flash_sale', 'flash-sale'), 'Flash sale fetch'),
    getHomepageTagProducts(tag('deals', 'deal'), 'Deals fetch'),
    getHomepageTagProducts(tag('best_sellers', 'best-seller'), 'Best sellers fetch'),
    getHomepageTagProducts(tag('top_sellers', 'top-seller'), 'Top sellers fetch'),
    getHomepageTagProducts(tag('sponsored', 'sponsored'), 'Sponsored fetch'),
    getHomepageTagProducts(tag('launching_deals', 'launching-deal'), 'Launching deals fetch'),
    getLocalMakersProducts(),
    withTimeout(getCategoryProducts(cat('electronics', 'electronics'), limit('electronics', 18)), 'Electronics products fetch', []),
    withTimeout(getCategoryProducts(cat('fashion', 'fashion-accessories'), limit('fashion', 18)), 'Fashion products fetch', []),
    // Extra sections added from admin — each fetches by tag_slug or category_slug
    ...extras.map((row) =>
      withTimeout(
        (async () => {
          const lim = row.content.display_limit || 10;
          if (row.content.tag_slug) {
            const raw = await getProducts({ tag: row.content.tag_slug, per_page: lim });
            return filterActiveVendorProducts(raw);
          }
          if (row.content.category_slug) {
            return getCategoryProducts(row.content.category_slug, lim);
          }
          return [];
        })(),
        `Extra section "${row.key}" fetch`,
        []
      )
    ),
  ]);

  const extraSections: ExtraSection[] = extras.map((row, i) => ({
    key: row.key,
    title: row.content.title || row.key,
    products: extraResults[i] ?? [],
  }));

  return {
    flashSaleProducts,
    dealProducts,
    trendingProducts,
    topSellerProducts,
    sponsoredProducts,
    launchingProducts,
    localMakersProducts,
    electronicsProducts,
    fashionProducts,
    extraSections,
  };
}
