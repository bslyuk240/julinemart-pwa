'use client';

import { useState, useEffect } from 'react';
import { getProducts } from '@/lib/woocommerce/products';
import ProductGrid from '@/components/product/product-grid';
import { Filter, ChevronDown } from 'lucide-react';
import { Product } from '@/types/product';

export default function AllProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'rating' | 'price' | 'price-desc'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const computeSortParams = (sort: typeof sortBy) => {
    if (sort === 'price-desc') {
      return { orderby: 'price' as const, order: 'desc' as const };
    }
    if (sort === 'price') {
      return { orderby: 'price' as const, order: 'asc' as const };
    }
    return { orderby: sort as 'date' | 'popularity' | 'rating', order: 'desc' as const };
  };

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const sortParams = computeSortParams(sortBy);
      const fetchedProducts = await getProducts({ 
        per_page: 20,
        page: 1,
        orderby: sortParams.orderby,
        order: sortParams.order
      });
      setProducts(fetchedProducts);
      setPage(1);
      setHasMore(fetchedProducts.length === 20);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const sortParams = computeSortParams(sortBy);
      const moreProducts = await getProducts({ 
        per_page: 20,
        page: nextPage,
        orderby: sortParams.orderby,
        order: sortParams.order
      });
      
      if (moreProducts.length > 0) {
        setProducts([...products, ...moreProducts]);
        setPage(nextPage);
        setHasMore(moreProducts.length === 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more products:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSort = async (newSortBy: 'date' | 'popularity' | 'rating' | 'price' | 'price-desc') => {
    try {
      setLoading(true);
      const { orderby, order } = computeSortParams(newSortBy);
      setSortBy(newSortBy);
      setSortOrder(order);
      
      const sortedProducts = await getProducts({ 
        per_page: 20,
        page: 1,
        orderby,
        order
      });
      
      setProducts(sortedProducts);
      setPage(1);
      setHasMore(sortedProducts.length === 20);
    } catch (error) {
      console.error('Error sorting products:', error);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">
            Browse our complete collection of {products.length}+ products
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
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
              onChange={(e) =>
                handleSort(e.target.value as 'date' | 'popularity' | 'rating' | 'price' | 'price-desc')
              }
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors appearance-none pr-8 cursor-pointer"
            >
              <option value="date">Latest</option>
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <ProductGrid products={products} columns={5} />

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

            {!hasMore && products.length > 20 && (
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
