'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductGrid from '@/components/product/product-grid';
import { Filter, ChevronDown } from 'lucide-react';
import { Product } from '@/types/product';

const sortFromParam = (value: string | null): 'date' | 'popularity' | 'rating' | 'price' | 'price-desc' | null => {
  if (!value) return null;
  if (value === 'price-desc') return 'price-desc';
  if (['date', 'popularity', 'rating', 'price'].includes(value)) {
    return value as 'date' | 'popularity' | 'rating' | 'price';
  }
  return null;
};

function dedupeKey(product: Product): string {
  if (product.supabaseId) return `sb:${product.supabaseId}`;
  if (product.slug) return `slug:${product.slug}`;
  return `id:${product.id}`;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sortBy = sortFromParam(searchParams.get('sort')) || 'date';
  const tagFilter = searchParams.get('tag');
  const searchKey = searchParams.toString();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showShell, setShowShell] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [nextPageToLoad, setNextPageToLoad] = useState(1);

  const BATCH_SIZE = 100;

  const sectionMeta = useMemo(() => {
    const map: Record<string, { title: string; description: string }> = {
      'flash-sale': {
        title: 'Flash Sale Items',
        description: 'Limited-time deals available right now',
      },
      deal: {
        title: "Today's Deals",
        description: 'Handpicked discounts curated for you',
      },
      'best-seller': {
        title: 'Trending Products',
        description: 'Most popular items right now',
      },
      'top-seller': {
        title: 'Top Sellers',
        description: 'Best selling products this month',
      },
      sponsored: {
        title: 'Sponsored Products',
        description: 'Featured picks from premium brands',
      },
      'launching-deal': {
        title: 'Launching Deals',
        description: 'Exclusive launch discounts - limited time',
      },
    };

    if (tagFilter && map[tagFilter]) {
      return map[tagFilter];
    }

    return {
      title: 'All Products',
      description: `Browse our complete collection of ${totalProducts || products.length} products`,
    };
  }, [tagFilter, products.length, totalProducts]);

  const computeSortParams = (sort: typeof sortBy) => {
    if (sort === 'price-desc') {
      return { orderby: 'price' as const, order: 'desc' as const };
    }
    if (sort === 'price') {
      return { orderby: 'price' as const, order: 'asc' as const };
    }
    return { orderby: sort as 'date' | 'popularity' | 'rating', order: 'desc' as const };
  };

  const buildProductsHref = (tag?: string) => {
    const qs = new URLSearchParams();
    if (sortBy !== 'date') {
      qs.set('sort', sortBy);
    }
    if (tag) {
      qs.set('tag', tag);
    }
    return qs.toString() ? `/products?${qs.toString()}` : '/products';
  };

  const buildFetchUrl = (pageNum: number) => {
    const sortParams = computeSortParams(sortBy);
    const qs = new URLSearchParams({
      per_page: String(BATCH_SIZE),
      page: String(pageNum),
      orderby: sortParams.orderby,
      order: sortParams.order,
    });
    if (tagFilter) qs.set('tag', tagFilter);
    return `/api/products?${qs.toString()}`;
  };

  const fetchFromApi = async (url: string, signal?: AbortSignal) => {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`Products API error: ${res.status}`);
    return res.json() as Promise<{ products: Product[]; total: number; totalPages: number }>;
  };

  useEffect(() => {
    const ac = new AbortController();
    let cancelled = false;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setProducts([]);
        setTotalProducts(0);
        setTotalPages(1);
        setNextPageToLoad(1);
        const { products: fetchedProducts, total } = await fetchFromApi(buildFetchUrl(1), ac.signal);
        if (cancelled || ac.signal.aborted) return;
        setProducts(fetchedProducts);
        const t = typeof total === 'number' && total >= 0 ? total : fetchedProducts.length;
        setTotalProducts(t);
        const tp = t > 0 ? Math.max(1, Math.ceil(t / BATCH_SIZE)) : 1;
        setTotalPages(tp);
        setNextPageToLoad(2);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error fetching products:', error);
      } finally {
        if (!cancelled && !ac.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();
    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowShell(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  const hasMore = nextPageToLoad <= totalPages && products.length < totalProducts;

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    const pageToLoad = nextPageToLoad;

    try {
      setLoadingMore(true);
      const { products: moreProducts, total } = await fetchFromApi(buildFetchUrl(pageToLoad));

      if (typeof total === 'number' && total > 0) {
        setTotalProducts(total);
        setTotalPages(Math.max(1, Math.ceil(total / BATCH_SIZE)));
      }

      if (moreProducts.length === 0) {
        setTotalPages((p) => Math.min(p, pageToLoad - 1));
        return;
      }

      setProducts((prev) => {
        const seen = new Set(prev.map(dedupeKey));
        const next = [...prev];
        for (const product of moreProducts) {
          const k = dedupeKey(product);
          if (!seen.has(k)) {
            seen.add(k);
            next.push(product);
          }
        }
        return next;
      });
      setNextPageToLoad(pageToLoad + 1);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const setSortInUrl = (newSortBy: typeof sortBy) => {
    const p = new URLSearchParams(searchParams.toString());
    if (newSortBy === 'date') {
      p.delete('sort');
    } else {
      p.set('sort', newSortBy);
    }
    const qs = p.toString();
    router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
  };

  if (loading && products.length === 0) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
        <div className="container-custom min-w-0 py-6">
          <div className="mb-6">
            <div className="mb-2 h-8 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
            <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
          </div>
          {showShell ? (
            <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-6 lg:gap-4">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <div className="aspect-square animate-pulse bg-gray-100" />
                  <div className="space-y-2 p-2 md:p-4">
                    <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                    <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom min-w-0 py-6">
        <div className="mb-6">
          <h1 className="mb-1 text-xl font-bold text-gray-900 md:text-3xl">{sectionMeta.title}</h1>
          <p className="text-sm text-gray-600 md:text-base">{sectionMeta.description}</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm md:p-4">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors md:px-4 md:text-base ${
                showFilters
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </button>

            <div className="hidden items-center gap-2 md:flex">
              <span className="text-sm text-gray-600">
                Showing {products.length} of {totalProducts || products.length} products
              </span>
            </div>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              disabled={loading}
              onChange={(e) => {
                setSortInUrl(e.target.value as typeof sortBy);
              }}
              className="flex cursor-pointer appearance-none items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm transition-colors hover:bg-gray-50 md:px-4 md:text-base disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="date">Latest</option>
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            {loading ? (
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            ) : (
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            )}
          </div>
        </div>

        {showFilters && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href={buildProductsHref()}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  !tagFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </Link>
              <Link
                href={buildProductsHref('flash-sale')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'flash-sale'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Flash Sale
              </Link>
              <Link
                href={buildProductsHref('deal')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'deal' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Deals
              </Link>
              <Link
                href={buildProductsHref('best-seller')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'best-seller'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Best Sellers
              </Link>
              <Link
                href={buildProductsHref('top-seller')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'top-seller'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top Sellers
              </Link>
              <Link
                href={buildProductsHref('sponsored')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'sponsored'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sponsored
              </Link>
              <Link
                href={buildProductsHref('launching-deal')}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  tagFilter === 'launching-deal'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Launching Deals
              </Link>
            </div>
          </div>
        )}

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} columns={6} />

            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {loadingMore ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}

            {!hasMore && totalProducts > BATCH_SIZE && (
              <div className="mt-8 text-center">
                <p className="text-gray-600">You&apos;ve reached the end of the catalog</p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg bg-white py-16 text-center">
            <p className="text-lg text-gray-600">No products found</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AllProductsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
          <div className="container-custom min-w-0 py-6">
            <div className="py-20 text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
              <p className="text-gray-600">Loading products...</p>
            </div>
          </div>
        </main>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
