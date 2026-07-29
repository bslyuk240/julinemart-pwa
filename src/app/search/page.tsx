'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/product/product-grid';
import PageHeader from '@/components/layout/page-header';
import { Product } from '@/types/product';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import { trackSearchUsed } from '@/lib/gtag';

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
        const qs = new URLSearchParams({ search: query, per_page: '24' });
        const res = await fetch(`/api/products?${qs.toString()}`);
        if (!res.ok) throw new Error(`Search API error: ${res.status}`);
        const { products: data } = await res.json();
        const filtered = await filterActiveVendorProducts(data ?? []);
        if (!isCancelled) {
          setProducts(filtered);
          trackSearchUsed({ searchTerm: query, resultCount: filtered.length });
        }
      } catch (error) {
        console.error('Error searching products:', error);
        if (!isCancelled) setProducts([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchResults();
    return () => { isCancelled = true; };
  }, [query]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-12">
      <div className="container-custom py-5 md:py-6">
        <PageHeader
          title="Search results"
          subtitle={query ? `Showing matches for "${query}"` : 'Enter a search term above to see matching products.'}
          backHref="/"
          backLabel="Back to home"
        />

        {loading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
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
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-600">
              We could not find any results for &quot;{query}&quot;. Try another search term.
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
      <div className="container-custom py-6">
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
