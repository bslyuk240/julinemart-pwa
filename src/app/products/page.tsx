'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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

function ProductsContent() {
  const searchParams = useSearchParams();

  const initialSort = sortFromParam(searchParams.get('sort')) || 'date';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'rating' | 'price' | 'price-desc'>(initialSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const tagFilter = searchParams.get('tag');
  const searchKey = searchParams.toString();

  const sectionMeta = useMemo(() => {
    const map: Record<
      string,
      { title: string; description: string }
    > = {
      'flash-sale': {
        title: 'Flash Sale Items',
        description: 'Limited-time deals available right now',
      },
      'deal': {
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
      'sponsored': {
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
      description: `Browse our complete collection of ${products.length}+ products`,
    };
  }, [tagFilter, products.length]);

  const computeSortParams = (sort: typeof sortBy) => {
    if (sort === 'price-desc') {
      return { orderby: 'price' as const, order: 'desc' as const };
    }
    if (sort === 'price') {
      return { orderby: 'price' as const, order: 'asc' as const };
    }
    return { orderby: sort as 'date' | 'popularity' | 'rating', order: 'desc' as const };
  };

  const PER_PAGE = 48;

  const buildFetchUrl = (pageNumber: number, overrideSort?: typeof sortBy) => {
    const activeSort = overrideSort || sortBy;
    const sortParams = computeSortParams(activeSort);
    const qs = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(pageNumber),
      orderby: sortParams.orderby,
      order: sortParams.order,
    });
    if (tagFilter) qs.set('tag', tagFilter);
    return `/api/products?${qs.toString()}`;
  };

  const fetchFromApi = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Products API error: ${res.status}`);
    return res.json() as Promise<{ products: Product[]; total: number; totalPages: number }>;
  };

  // Sync sort with URL param on navigation changes
  useEffect(() => {
    const urlSort = sortFromParam(searchParams.get('sort'));
    if (urlSort && urlSort !== sortBy) {
      setSortBy(urlSort);
    }
  }, [searchParams, sortBy]);

  // Fetch products when filters or sort change
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const { products: fetchedProducts, totalPages: pages } = await fetchFromApi(buildFetchUrl(1));
        setProducts(fetchedProducts);
        setPage(1);
        setTotalPages(pages || 999);
        // Always show "Load More" if we have products - only hide when next page returns 0
        setHasMore(fetchedProducts.length > 0);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, sortBy]);

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { products: moreProducts, totalPages: pages } = await fetchFromApi(buildFetchUrl(nextPage));
      
      setProducts((prev) => [...prev, ...moreProducts]);
      setPage(nextPage);
      if (pages > 0) setTotalPages(pages);
      // Hide button only when we get 0 products (reached the end)
      setHasMore(moreProducts.length > 0);
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSort = async (newSortBy: 'date' | 'popularity' | 'rating' | 'price' | 'price-desc') => {
    console.log('🔄 Sorting products by:', newSortBy);
    try {
      setLoading(true);
      const { orderby, order } = computeSortParams(newSortBy);
      setSortBy(newSortBy);
      setSortOrder(order);
      
      console.log('📊 Sort params:', { orderby, order });
      const { products: sortedProducts, totalPages: pages } = await fetchFromApi(buildFetchUrl(1, newSortBy));
      console.log('✅ Sorted products loaded:', sortedProducts.length);
      
      setProducts(sortedProducts);
      setPage(1);
      setTotalPages(pages || 999);
      setHasMore(sortedProducts.length > 0);
    } catch (error) {
      console.error('❌ Error sorting products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && products.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1">{sectionMeta.title}</h1>
          <p className="text-sm md:text-base text-gray-600">
            {sectionMeta.description}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-white p-3 md:p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 md:px-4 border rounded-lg transition-colors text-sm md:text-base ${
                showFilters 
                  ? 'border-primary-600 bg-primary-50 text-primary-700' 
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filters</span>
            </button>
            
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Showing {products.length} products
              </span>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              disabled={loading}
              onChange={(e) => {
                console.log('Sort changed to:', e.target.value);
                handleSort(e.target.value as 'date' | 'popularity' | 'rating' | 'price' | 'price-desc');
              }}
              className="flex items-center gap-2 px-3 py-2 md:px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors appearance-none pr-8 cursor-pointer text-sm md:text-base bg-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="date">Latest</option>
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            {loading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/products"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  !tagFilter 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Products
              </Link>
              <Link
                href="/products?tag=flash-sale"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  tagFilter === 'flash-sale' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Flash Sale
              </Link>
              <Link
                href="/products?tag=deal"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  tagFilter === 'deal' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Deals
              </Link>
              <Link
                href="/products?tag=best-seller"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  tagFilter === 'best-seller' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Best Sellers
              </Link>
              <Link
                href="/products?tag=top-seller"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  tagFilter === 'top-seller' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Top Sellers
              </Link>
              <Link
                href="/products?tag=sponsored"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                  tagFilter === 'sponsored' 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sponsored
              </Link>
              <Link
                href="/products?tag=launching-deal"
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
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

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <ProductGrid products={products} columns={6} />

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  {loadingMore ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}

            {!hasMore && products.length > PER_PAGE && (
              <div className="text-center mt-8">
                <p className="text-gray-600">You've reached the end of the catalog</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg">
            <p className="text-gray-600 text-lg">No products found</p>
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
        <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
          <div className="container mx-auto px-4 py-6">
            <div className="text-center py-20">
              <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
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