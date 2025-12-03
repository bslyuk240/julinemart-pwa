'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/product/product-grid';
import { searchProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setHasSearched(false);
      return;
    }

    let isCancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setHasSearched(true);

      try {
        const data = await searchProducts(query, { per_page: 24 });
        if (!isCancelled) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Error searching products:', error);
        if (!isCancelled) {
          setProducts([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      isCancelled = true;
    };
  }, [query]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-12">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Search results</h1>
          <p className="text-gray-600 mt-1">
            {query ? `Showing matches for "${query}"` : 'Enter a search term above to see matching products.'}
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-10 text-center">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Searching products...</p>
          </div>
        )}

        {!loading && query && products.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{products.length} product{products.length === 1 ? '' : 's'} found</span>
            </div>
            <ProductGrid products={products} columns={6} />
          </div>
        )}

        {!loading && query && hasSearched && products.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-600">
              We could not find any results for "{query}". Try another search term.
            </p>
          </div>
        )}

        {!query && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-700">
              Use the search bar in the header to find products by name, brand, or category.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function SearchFallback() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-12">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading search...</p>
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchContent />
    </Suspense>
  );
}
