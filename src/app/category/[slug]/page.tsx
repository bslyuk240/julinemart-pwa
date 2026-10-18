'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import ProductGrid from '@/components/product/product-grid';
import { Filter, ChevronDown, X, Search } from 'lucide-react';
import { Product } from '@/types/product';
import { getCategoryDisplayName } from '@/lib/utils/category-display';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar, { TopBarAction } from '@/components/mobile/shell/mobile-top-bar';
import ListingToolbar from '@/components/mobile/listing/listing-toolbar';
import ListingSkeleton from '@/components/mobile/listing/listing-skeleton';
import {
  EMPTY_LISTING_FILTERS,
  applyListingFilters,
  countActiveFilters,
  sellerOptions,
  type ListingFilters,
} from '@/lib/mobile/listing-filters';

type CategorySortOption = 'date' | 'popularity' | 'rating' | 'price' | 'price-desc';

/** JLO catalog-products caps per_page at 100; request that and paginate by category server-side. */
const CATALOG_PER_PAGE = 100;
/** How many already-fetched products to reveal per render batch (images lazy-load, so no extra network cost). */
const VISIBLE_PAGE_SIZE = 50;
/**
 * The catalog API ignores price/stock filters, so mobile filters run client-side.
 * While one is on, pull up to this many API pages so results are not limited to page 1.
 */
const MAX_FILTER_PAGES = 5;

const SORT_OPTIONS: { value: CategorySortOption; label: string }[] = [
  { value: 'date', label: 'Latest' },
  { value: 'popularity', label: 'Popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'price', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  // Mobile tier (docs/mobile-tier-plan.md, M2): mobile-only pieces are gated on
  // `tier` plus md:hidden / max-md: classes; desktop is unchanged.
  const tier = useMobileTier() !== null;
  const [filters, setFilters] = useState<ListingFilters>(EMPTY_LISTING_FILTERS);
  const filtersActive = countActiveFilters(filters) > 0;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortBy, setSortBy] = useState<CategorySortOption>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(VISIBLE_PAGE_SIZE);
  const [apiPage, setApiPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const categoryName = getCategoryDisplayName(slug);

  const computeSortParams = (sort: CategorySortOption) => {
    if (sort === 'price-desc') {
      return { orderby: 'price' as const, order: 'desc' as const };
    }

    if (sort === 'price') {
      return { orderby: 'price' as const, order: 'asc' as const };
    }

    return { orderby: sort as 'date' | 'popularity' | 'rating', order: 'desc' as const };
  };

  const buildUrl = (sort: CategorySortOption, page: number) => {
    const sortParams = computeSortParams(sort);
    const qs = new URLSearchParams({
      per_page: String(CATALOG_PER_PAGE),
      page: String(page),
      category: slug,
      orderby: sortParams.orderby,
      order: sortParams.order,
    });
    return `/api/products?${qs.toString()}`;
  };

  const fetchFromApi = async (
    url: string,
    signal?: AbortSignal
  ): Promise<{ products: Product[]; total: number; totalPages: number }> => {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) throw new Error(`Products API error: ${res.status}`);
    return res.json();
  };

  useEffect(() => {
    const ac = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setApiPage(1);
        const { products: fetched, total: count, totalPages: pages } = await fetchFromApi(buildUrl(sortBy, 1), ac.signal);
        setProducts(fetched);
        setTotal(count);
        setTotalPages(Math.max(1, pages));
        setVisibleCount(VISIBLE_PAGE_SIZE);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Error fetching category products:', error);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sortBy]);

  const filteredProducts = useMemo(() => applyListingFilters(products, filters), [products, filters]);
  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const sellers = useMemo(() => sellerOptions(products), [products]);
  const hasMoreInBuffer = visibleCount < filteredProducts.length;
  const hasMoreFromApi = apiPage < totalPages;
  const hasMore = hasMoreInBuffer || hasMoreFromApi;

  const loadMore = async () => {
    if (visibleCount < filteredProducts.length) {
      setVisibleCount((current) => Math.min(current + VISIBLE_PAGE_SIZE, filteredProducts.length));
      return;
    }
    await fetchNextPage();
  };

  const fetchNextPage = async () => {
    if (apiPage >= totalPages || loadingMore) return;
    try {
      setLoadingMore(true);
      const nextPage = apiPage + 1;
      const { products: more, totalPages: pages } = await fetchFromApi(buildUrl(sortBy, nextPage));
      setProducts((prev) => [...prev, ...more]);
      setApiPage(nextPage);
      setTotalPages(Math.max(totalPages, pages));
      setVisibleCount((current) => current + Math.min(VISIBLE_PAGE_SIZE, more.length));
    } catch (error) {
      console.error('Error loading more category products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // While a mobile filter is on, fill the buffer from more API pages (capped).
  useEffect(() => {
    if (!filtersActive || loading || loadingMore) return;
    if (apiPage >= Math.min(totalPages, MAX_FILTER_PAGES)) return;
    const fill = async () => {
      await fetchNextPage();
    };
    void fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersActive, loading, loadingMore, apiPage, totalPages]);

  // Mobile tier: infinite scroll instead of the "View More Products" button.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!tier || !sentinel || !hasMore || loadingMore) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, hasMore, loadingMore, visibleCount, filteredProducts.length]);

  const mobileTopBar = tier && (
    <MobileTopBar
      title={categoryName}
      backHref="/categories"
      actions={
        <TopBarAction label="Search" onClick={() => router.push('/search')}>
          <Search className="h-6 w-6" aria-hidden />
        </TopBarAction>
      }
    />
  );

  const mobileToolbar = tier && (
    <ListingToolbar
      sort={sortBy}
      sortOptions={SORT_OPTIONS}
      onSortChange={setSortBy}
      filters={filters}
      onFiltersChange={(next) => {
        setFilters(next);
        setVisibleCount(VISIBLE_PAGE_SIZE);
        window.scrollTo({ top: 0 });
      }}
      sellers={sellers}
      countFor={(draft) => applyListingFilters(products, draft).length}
    />
  );

  if (loading) {
    return (
      <main className={clsx('min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8', tier && 'max-md:overflow-x-clip max-md:bg-m-surface max-md:pb-6')}>
        {mobileTopBar}
        <div className={clsx('container-custom min-w-0 py-6', tier && 'max-md:pt-0')}>
          {tier && <ListingSkeleton />}
          <div className={clsx('py-20 text-center', tier && 'max-md:hidden')}>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={clsx('min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8', tier && 'max-md:overflow-x-clip max-md:bg-m-surface max-md:pb-6')}>
      {mobileTopBar}
      <div className={clsx('container-custom min-w-0 py-6', tier && 'max-md:pt-0')}>
        {mobileToolbar}
        <nav className={clsx('mb-6 text-sm text-gray-600', tier && 'max-md:hidden')}>
          <a href="/" className="hover:text-primary-600">
            Home
          </a>
          <span className="mx-2">/</span>
          <a href="/categories" className="hover:text-primary-600">
            Categories
          </a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{categoryName}</span>
        </nav>

        <div className={clsx('mb-6', tier && 'max-md:hidden')}>
          <h1 className="mb-1 text-base font-bold text-gray-900 md:text-xl">{categoryName}</h1>
          <p className="text-xs text-gray-600 md:text-sm">
            {total > 0 ? `${total} products found` : 'Browse products in this category'}
          </p>
        </div>

        <div className={clsx('mb-6 flex items-center justify-between rounded-2xl bg-white p-3 md:p-4 shadow-sm', tier && 'max-md:hidden')}>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowFilters((prev) => !prev)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                showFilters
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden font-medium md:inline">Filters</span>
            </button>
            <div className="hidden items-center gap-2 md:flex">
              <span className="text-sm text-gray-600">{visibleProducts.length} products</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CategorySortOption)}
              className="cursor-pointer appearance-none rounded-lg border border-gray-300 px-4 py-2 pr-8 text-sm transition-colors hover:bg-gray-50"
            >
              <option value="date">Latest</option>
              <option value="popularity">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          </div>
        </div>

        {showFilters && (
          <div className={clsx('mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm', tier && 'max-md:hidden')}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Quick filters</h3>
              <button
                type="button"
                onClick={() => setShowFilters(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Latest', value: 'date' },
                { label: 'Popular', value: 'popularity' },
                { label: 'Top Rated', value: 'rating' },
                { label: 'Price: Low to High', value: 'price' },
                { label: 'Price: High to Low', value: 'price-desc' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSortBy(option.value as CategorySortOption)}
                  className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                    sortBy === option.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {visibleProducts.length > 0 ? (
          <>
            <ProductGrid products={visibleProducts} columns={4} mobileTier={tier} />
            {tier && hasMore && (
              <div ref={sentinelRef} className="grid h-16 place-items-center md:hidden" aria-hidden={!loadingMore}>
                {loadingMore && (
                  <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-m-primary border-t-transparent" />
                )}
              </div>
            )}
            {hasMore && (
              <div className={clsx('mt-8 text-center', tier && 'max-md:hidden')}>
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'View More Products'}
                </button>
              </div>
            )}
          </>
        ) : tier && filtersActive && products.length > 0 ? (
          <div className="px-6 py-16 text-center md:hidden">
            <h2 className="text-m-title-m text-m-on-surface">No products match these filters</h2>
            <p className="mt-1 text-m-body-m text-m-on-surface-variant">Try a wider price range or fewer filters.</p>
            <button
              type="button"
              onClick={() => setFilters(EMPTY_LISTING_FILTERS)}
              className="mt-5 h-10 rounded-full bg-m-primary-container px-5 text-m-label-l text-m-on-primary-container"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-white py-16 text-center">
            <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Filter className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">No products found</h3>
            <p className="mb-6 text-gray-600">This category is currently empty. Check back later!</p>
            <a
              href="/products"
              className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Browse All Products
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
