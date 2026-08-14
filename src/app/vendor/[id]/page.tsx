'use client';

import { Fragment, useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Store, Star } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { Product } from '@/types/product';
import { getStorePolicies, StorePolicies } from '@/lib/woocommerce/policies';
import { formatPrice } from '@/lib/utils/format-price';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { SellerTrustPanel } from '@/components/trust/SellerTrustBadge';
import { VendorStoreInlineActions, VendorStoreQrPanel } from '@/components/vendor/VendorStoreHeroActions';
import VendorMeetSection from '@/components/vendor/VendorMeetSection';
import type { VendorTrustResponse } from '@/lib/trust/get-vendor-trust';

type VendorSortOption = 'date' | 'popularity' | 'price' | 'price-desc';
/** API route caps per_page at 100 and caches the underlying JLO fetch for 300s. */
const INITIAL_PAGE_SIZE = 50;

interface VendorData {
  id: number | string;
  store_name: string;
  store_logo?: string | null;
  banner?: string | null;
  shop_description?: string | null;
  email?: string | null;
  phone?: string | null;
  is_active?: boolean;
  store_slug?: string;
  intro_video_url?: string | null;
  store_url?: string;
  rating?: { avg?: string; rating?: string; count?: number };
  enabled?: boolean;
  is_store_vacation?: boolean;
  vacation_message?: string;
}

const getProductPrice = (product: Product) => {
  const price = Number(product.price || product.sale_price || product.regular_price || 0);
  return Number.isFinite(price) ? price : 0;
};

const sortProducts = (items: Product[], sortBy: VendorSortOption) => {
  const arr = [...items];
  arr.sort((a, b) => {
    if (sortBy === 'popularity')  return (b.total_sales || 0) - (a.total_sales || 0);
    if (sortBy === 'price')       return getProductPrice(a) - getProductPrice(b);
    if (sortBy === 'price-desc')  return getProductPrice(b) - getProductPrice(a);
    return new Date(b.date_created || 0).getTime() - new Date(a.date_created || 0).getTime();
  });
  return arr;
};

export default function VendorStorePage() {
  const params    = useParams();
  const vendorId  = params.id as string;

  const [vendor,       setVendor]       = useState<VendorData | null>(null);
  const [products,     setProducts]     = useState<Product[]>([]);
  const [total,        setTotal]        = useState<number | null>(null);
  const [sortBy,       setSortBy]       = useState<VendorSortOption>('date');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [loadingMore,  setLoadingMore]  = useState(false);
  const [currentPage,  setCurrentPage]  = useState(0);
  const [totalPages,   setTotalPages]   = useState(0);
  const [policies,     setPolicies]     = useState<StorePolicies | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [trust,        setTrust]        = useState<VendorTrustResponse | null>(null);

  // ── Fetch vendor + products from Supabase-backed API ────────────────────────
  const fetchVendor = useCallback(async (opts: { silent?: boolean; page?: number; perPage?: number; append?: boolean } = {}) => {
    const { silent = false, page = 1, perPage = INITIAL_PAGE_SIZE, append = false } = opts;
    if (!silent) setLoading(true);
    try {
      const res  = await fetch(
        `/api/vendor/${encodeURIComponent(vendorId)}?page=${page}&per_page=${perPage}`
      );
      const data = await res.json() as {
        vendor: VendorData;
        products: Product[];
        total: number;
        totalPages?: number;
        page?: number;
        perPage?: number;
        source: string;
      };

      if (data.vendor) setVendor(data.vendor);

      try {
        const trustRes = await fetch(`/api/vendor/${encodeURIComponent(vendorId)}/trust`);
        if (trustRes.ok) {
          const trustData = await trustRes.json();
          setTrust(trustData.trust ?? null);
        } else {
          setTrust(null);
        }
      } catch {
        setTrust(null);
      }

      if (data.products) {
        setProducts(prev => {
          if (!append) return sortProducts(data.products, sortBy);
          // Deduplicate by supabase_id then woo id — prevents duplicates when
          // catalog pagination is unstable (products with identical created_at).
          const seen = new Set(prev.map(p => p.slug || String(p.id)));
          const fresh = data.products.filter(p => !seen.has(p.slug || String(p.id)));
          return sortProducts([...prev, ...fresh], sortBy);
        });
        setTotal(data.total ?? data.products.length);
        setCurrentPage(data.page ?? page);
        setTotalPages(data.totalPages ?? 0);
      }
    } catch (err) {
      console.error('Error fetching vendor:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [vendorId, sortBy]);

  const fetchPolicies = useCallback(async (forceRefresh = false, opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setPolicyLoading(true);
    try {
      const data = await getStorePolicies(forceRefresh);
      setPolicies(data);
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      if (!silent) setPolicyLoading(false);
    }
  }, []);

  useEffect(() => { fetchVendor({ page: 1, perPage: INITIAL_PAGE_SIZE }); },   [fetchVendor]);
  useEffect(() => { fetchPolicies(); }, [fetchPolicies]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchVendor({ silent: true, page: 1, perPage: INITIAL_PAGE_SIZE }),
      fetchPolicies(true, { silent: true }),
    ]);
    setRefreshing(false);
  }, [fetchVendor, fetchPolicies]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    const nextPage = currentPage + 1;
    if (totalPages > 0 && nextPage > totalPages) return;

    setLoadingMore(true);
    try {
      await fetchVendor({
        silent: true,
        page: nextPage,
        perPage: INITIAL_PAGE_SIZE,
        append: true,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, fetchVendor, loadingMore, totalPages]);

  const handleSortChange = (newSort: VendorSortOption) => {
    setSortBy(newSort);
    setProducts(prev => sortProducts(prev, newSort));
  };

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: loading,
  });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen overflow-x-clip bg-gray-50 pb-24 md:pb-8">
        <div className="container-custom min-w-0 py-6">
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading store...</p>
          </div>
        </div>
      </main>
    );
  }

  // ── Vendor disabled ──────────────────────────────────────────────────────────
  if (vendor && vendor.enabled === false) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
        <div className="container-custom min-w-0 py-6">
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Unavailable</h2>
            <p className="text-gray-600 mb-6">This store is currently not accepting orders.</p>
            <Link href="/" className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Browse Other Stores
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Vacation mode ────────────────────────────────────────────────────────────
  if (vendor && vendor.is_store_vacation === true) {
    return (
      <main className="min-h-screen overflow-x-clip bg-gray-50 pb-24 md:pb-8">
        <div className="container-custom min-w-0 py-6">
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Store on Vacation</h2>
            <p className="text-gray-600 mb-6">
              {vendor.vacation_message || 'This store is temporarily closed. Please check back soon!'}
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Browse Other Stores
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────────
  const vendorName   = vendor?.store_name || `Vendor #${vendorId}`;
  const vendorAvatar = vendor?.store_logo || null;
  const vendorBanner = vendor?.banner     || null;
  const ratingAvg    = vendor?.rating?.avg || vendor?.rating?.rating || null;
  const ratingValue  = ratingAvg ? Math.min(5, Math.max(0, Number(ratingAvg))) : 0;
  const reviewCount  = vendor?.rating?.count ?? 0;

  const mobileStats = [
    { val: total ?? products.length, label: 'Products', color: 'text-primary-600' },
    ...(ratingAvg
      ? [{ val: ratingAvg, label: 'Rating', color: 'text-yellow-600' }]
      : []),
    ...(reviewCount > 0
      ? [{ val: reviewCount, label: 'Reviews', color: 'text-blue-600' }]
      : []),
  ];

  const desktopStats = [
    { val: total ?? products.length, label: 'Products' },
    ...(ratingAvg ? [{ val: ratingAvg, label: 'Rating' }] : []),
    ...(reviewCount > 0 ? [{ val: reviewCount, label: 'Reviews' }] : []),
  ];

  const freeShippingThreshold = policies?.shippingPolicy?.freeShippingThreshold ?? 0;
  const shippingDescription   = policies?.shippingPolicy?.description;
  const shippingText = policies?.shippingPolicy
    ? freeShippingThreshold > 0
      ? `Free shipping on orders over ${formatPrice(freeShippingThreshold)}.${shippingDescription ? ` ${shippingDescription}` : ''}`
      : shippingDescription || 'Shipping details will appear here once available.'
    : 'Shipping details will appear here once available.';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen overflow-x-clip bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom min-w-0 py-6">

        {/* Pull-to-refresh indicator */}
        {(pullDistance > 0 || isRefreshing || refreshing) && (
          <div className="flex justify-center mb-2 transition-transform duration-150"
            style={{ transform: `translateY(${Math.min(pullDistance, 40)}px)` }}>
            <div className="flex items-center gap-2 rounded-full bg-white shadow px-3 py-1 text-xs text-gray-700">
              <span className={`h-2 w-2 rounded-full ${isRefreshing || refreshing ? 'bg-primary-600 animate-pulse' : 'bg-gray-400'}`} />
              <span>{isRefreshing || refreshing ? 'Refreshing store...' : pullDistance >= 70 ? 'Release to refresh' : 'Pull to refresh'}</span>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <a href="/" className="hover:text-primary-600">Home</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Store: {vendorName}</span>
        </nav>

        {/* Banner */}
        {vendorBanner && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-sm">
            <div className="w-full h-48 md:h-64 bg-cover bg-center"
              style={{ backgroundImage: `url(${vendorBanner})`, backgroundColor: '#f3f4f6' }} />
          </div>
        )}

        {trust && (
          <div className="mb-6">
            <SellerTrustPanel
              level={trust.level}
              verifications={trust.verifications}
              successfulOrders={trust.metrics?.successful_orders}
              fulfilmentRate={trust.metrics?.fulfilment_rate}
              physicalStore={trust.physical_store}
            />
          </div>
        )}

        {(vendor?.intro_video_url || (vendor?.shop_description && vendor.shop_description.length > 120)) && (
          <VendorMeetSection
            vendorName={vendorName}
            story={vendor?.shop_description}
            logoUrl={vendorAvatar}
            introVideoUrl={vendor?.intro_video_url}
          />
        )}

        {/* Vendor Header Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-8">
          {/* Mobile */}
          <div className="md:hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-gray-100 flex-shrink-0 ${vendorAvatar ? 'bg-white' : 'bg-gradient-to-br from-primary-500 to-primary-700'}`}>
                  {vendorAvatar
                    ? <img src={vendorAvatar} alt={vendorName} className="w-full h-full object-cover" />
                    : <Store className="w-8 h-8 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <h1 className="min-w-0 flex-1 truncate text-base font-bold text-gray-900">{vendorName}</h1>
                    <VendorStoreInlineActions vendorId={vendorId} vendorName={vendorName} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${ratingValue > i ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                    ))}
                    <span className="text-gray-500 text-xs">{ratingAvg ?? 'No ratings'}</span>
                  </div>
                  <VendorStoreQrPanel
                    vendorId={vendorId}
                    vendorName={vendorName}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 flex items-center justify-between text-center">
              {mobileStats.map((s, i, arr) => (
                <Fragment key={`${s.label}-${i}`}>
                  <div className="flex-1">
                    <div className={`font-bold ${s.color}`} style={{ fontSize: 18 }}>{s.val}</div>
                    <div className="text-gray-600" style={{ fontSize: 11 }}>{s.label}</div>
                  </div>
                  {i < arr.length - 1 && <div className="h-8 w-px bg-gray-200" />}
                </Fragment>
              ))}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:block p-6">
            <div className="flex gap-6">
              <div className="flex-shrink-0">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden ${vendorAvatar ? 'bg-white shadow-sm border-2 border-gray-200' : 'bg-gradient-to-br from-primary-500 to-primary-700'}`}>
                  {vendorAvatar
                    ? <img src={vendorAvatar} alt={vendorName} className="w-full h-full object-cover" />
                    : <Store className="w-16 h-16 text-white" />}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h1 className="min-w-0 text-3xl font-bold text-gray-900">{vendorName}</h1>
                  <VendorStoreInlineActions vendorId={vendorId} vendorName={vendorName} />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${ratingValue > i ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-sm text-gray-600">{ratingAvg ? `(${ratingAvg} rating)` : '(No ratings yet)'}</span>
                </div>
                {vendor?.shop_description && (
                  <p className="text-sm text-gray-600 max-w-2xl mb-3">{vendor.shop_description}</p>
                )}
                <VendorStoreQrPanel vendorId={vendorId} vendorName={vendorName} className="mb-1" />
                <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t">
                  {desktopStats.map((s, i) => (
                    <div key={`${s.label}-${i}`} className="text-center min-w-[4rem]">
                      <p className="text-2xl font-bold text-primary-600">{s.val}</p>
                      <p className="text-xs text-gray-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              All Products ({total ?? products.length})
            </h2>
            <select value={sortBy} onChange={e => handleSortChange(e.target.value as VendorSortOption)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="date">Latest</option>
              <option value="popularity">Popular</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>

          {products.length > 0 ? (
            <>
              <ProductGrid products={products} columns={6} />
              {(total ?? 0) > products.length && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center rounded-lg border border-primary-600 px-5 py-3 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingMore ? 'Loading more...' : 'Load more products'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products Yet</h3>
              <p className="text-gray-600 mb-6">This store hasn&apos;t added any products yet.</p>
              <Link href="/" className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Browse Other Stores
              </Link>
            </div>
          )}
        </div>

        {/* Store Policies */}
        {products.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Return Policy</h3>
              {policyLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
                <p className="text-sm text-gray-600">
                  {policies?.returnPolicy?.enabled
                    ? `${policies.returnPolicy.days}-day return window. ${policies.returnPolicy.description}`
                    : 'Returns are currently unavailable for this store.'}
                </p>
              )}
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Shipping</h3>
              {policyLoading ? <p className="text-sm text-gray-500">Loading...</p>
                : <p className="text-sm text-gray-600">{shippingText}</p>}
            </div>
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Customer Service</h3>
              <p className="text-sm text-gray-600">
                Contact the seller through your order page after purchase. JulineMart support is
                available if you need help with an order issue.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
