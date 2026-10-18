'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductGrid from '@/components/product/product-grid';
import PageHeader from '@/components/layout/page-header';
import AreaFilterBar, { type AreaFilters } from '@/components/local/AreaFilterBar';
import { Product } from '@/types/product';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import { trackSearchUsed } from '@/lib/gtag';
import { clsx } from 'clsx';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileSearchView from '@/components/mobile/listing/mobile-search-view';
import ListingSkeleton from '@/components/mobile/listing/listing-skeleton';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  // Mobile tier (docs/mobile-tier-plan.md, M2): full-screen search below md.
  const tier = useMobileTier() !== null;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState<AreaFilters>({
    state: '',
    city: '',
    area: '',
    pickupOnly: false,
  });

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
        if (filters.state) qs.set('near_state', filters.state);
        if (filters.city) qs.set('near_city', filters.city);
        if (filters.area) qs.set('near_area', filters.area);
        if (filters.pickupOnly) qs.set('pickup_available', 'true');
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
  }, [query, filters]);

  const results = (
    <>
        {query && (
          <AreaFilterBar
            value={filters}
            onChange={setFilters}
            showPickupToggle
            className="mb-4"
          />
        )}

        {loading && tier && <ListingSkeleton />}
        {loading && (
          <div className={clsx('bg-white rounded-2xl shadow-sm p-8 text-center', tier && 'max-md:hidden')}>
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Searching products...</p>
          </div>
        )}

        {!loading && query && products.length > 0 && (
          <div className="space-y-3">
            <div className={clsx('flex items-center justify-between text-sm text-gray-600', tier && 'max-md:pt-3 max-md:text-m-body-m max-md:text-m-on-surface-variant')}>
              <span>{products.length} product{products.length === 1 ? '' : 's'} found</span>
            </div>
            <ProductGrid products={products} columns={6} mobileTier={tier} />
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
    </>
  );

  return (
    <main className={clsx('min-h-screen bg-gray-50 pb-24 md:pb-12', tier && 'max-md:overflow-x-clip max-md:bg-m-surface')}>
      <div className={clsx('container-custom py-5 md:py-6', tier && 'max-md:pt-0')}>
        <div className={clsx(tier && 'max-md:hidden')}>
          <PageHeader
            title="Search results"
            subtitle={query ? `Showing matches for "${query}"` : 'Enter a search term above to see matching products.'}
            backHref="/"
            backLabel="Back to home"
          />
        </div>

        {tier ? <MobileSearchView query={query}>{results}</MobileSearchView> : results}
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
