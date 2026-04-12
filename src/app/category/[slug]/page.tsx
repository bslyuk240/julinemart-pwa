'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProductGrid from '@/components/product/product-grid';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Product } from '@/types/product';
import { filterProductsByCategory } from '@/lib/utils/category-filters';

type CategorySortOption = 'date' | 'popularity' | 'rating' | 'price' | 'price-desc';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<CategorySortOption>('date');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const perPage = 500;

  const categoryName = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const computeSortParams = (sort: CategorySortOption) => {
    if (sort === 'price-desc') {
      return { orderby: 'price' as const, order: 'desc' as const };
    }

    if (sort === 'price') {
      return { orderby: 'price' as const, order: 'asc' as const };
    }

    return { orderby: sort as 'date' | 'popularity' | 'rating', order: 'desc' as const };
  };

  const buildUrl = (sort: CategorySortOption) => {
    const sortParams = computeSortParams(sort);
    const qs = new URLSearchParams({
      per_page: String(perPage),
      page: '1',
      orderby: sortParams.orderby,
      order: sortParams.order,
    });
    return `/api/products?${qs.toString()}`;
  };

  const fetchFromApi = async (url: string): Promise<{ products: Product[]; total: number; totalPages: number }> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Products API error: ${res.status}`);
    return res.json();
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { products: fetched } = await fetchFromApi(buildUrl(sortBy));
        const filtered = filterProductsByCategory(fetched, slug);
        setProducts(filtered);
        setVisibleCount(24);
      } catch (error) {
        console.error('Error fetching category products:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sortBy]);

  const visibleProducts = useMemo(() => products.slice(0, visibleCount), [products, visibleCount]);
  const hasMore = visibleCount < products.length;

  const loadMore = () => {
    setVisibleCount((current) => Math.min(current + 24, products.length));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        <nav className="mb-6 text-sm text-gray-600">
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

        <div className="mb-6">
          <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl">{categoryName}</h1>
          <p className="text-sm text-gray-600 md:text-base">
            {products.length > 0 ? `${products.length} products found` : 'Browse products in this category'}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-lg bg-white p-4 shadow-sm">
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
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
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
            <ProductGrid products={visibleProducts} columns={4} />
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={loadMore}
                  className="rounded-lg bg-primary-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  View More Products
                </button>
              </div>
            )}
          </>
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
