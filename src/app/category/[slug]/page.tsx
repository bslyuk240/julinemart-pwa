'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import ProductGrid from '@/components/product/product-grid';
import { Filter, ChevronDown } from 'lucide-react';
import { Product } from '@/types/product';

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'rating' | 'price'>('date');
  const perPage = 24;

  const categoryName = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const buildUrl = (pageNumber: number, sort: typeof sortBy) => {
    const qs = new URLSearchParams({
      category: slug,
      per_page: String(perPage),
      page: String(pageNumber),
      orderby: sort,
      order: 'desc',
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
        setHasMore(true);
        setPage(1);
        const { products: fetched } = await fetchFromApi(buildUrl(1, sortBy));
        setProducts(fetched);
        setHasMore(fetched.length === perPage);
      } catch (error) {
        console.error('Error fetching category products:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sortBy]);

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const { products: more } = await fetchFromApi(buildUrl(nextPage, sortBy));
      if (more.length > 0) {
        setProducts((prev) => [...prev, ...more]);
        setPage(nextPage);
        setHasMore(more.length === perPage);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
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
        <nav className="text-sm text-gray-600 mb-6">
          <a href="/" className="hover:text-primary-600">Home</a>
          <span className="mx-2">/</span>
          <a href="/categories" className="hover:text-primary-600">Categories</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{categoryName}</span>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{categoryName}</h1>
          <p className="text-sm md:text-base text-gray-600">
            {products.length > 0 ? `${products.length} products found` : 'Browse products in this category'}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="font-medium hidden md:inline">Filters</span>
            </button>
            <div className="hidden md:flex items-center gap-2">
              <span className="text-sm text-gray-600">{products.length} products</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors appearance-none pr-8 cursor-pointer text-sm"
            >
              <option value="date">Latest</option>
              <option value="popularity">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price">Price: Low to High</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {products.length > 0 ? (
          <>
            <ProductGrid products={products} columns={4} />
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
                >
                  {loadingMore ? 'Loading...' : 'View More Products'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Filter className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-6">This category is currently empty. Check back later!</p>
            <a
              href="/products"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Browse All Products
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
