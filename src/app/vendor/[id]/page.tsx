'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Store, MapPin, Star, Mail } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { getProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';
import { getStorePolicies, StorePolicies } from '@/lib/woocommerce/policies';
import { formatPrice } from '@/lib/utils/format-price';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getVendorById } from '@/lib/woocommerce/vendors';
import type { Vendor, VendorAddress } from '@/types/vendor';

const formatVendorAddress = (address?: VendorAddress | string) => {
  if (!address) {
    return 'Address not available';
  }

  if (typeof address === 'string') {
    return address;
  }

  const parts = [
    address.street_1,
    address.street_2,
    address.city,
    address.state,
    address.zip,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

const humanizeSlug = (value?: string) => {
  if (!value) {
    return undefined;
  }
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

export default function VendorStorePage() {
  const params = useParams();
  const vendorId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [policies, setPolicies] = useState<StorePolicies | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const fetchPolicies = useCallback(
    async (forceRefresh = false, opts: { silent?: boolean } = {}) => {
      const { silent = false } = opts;
      try {
        if (!silent) setPolicyLoading(true);
        const data = await getStorePolicies(forceRefresh);
        setPolicies(data);
      } catch (error) {
        console.error('Error fetching store policies:', error);
      } finally {
        if (!silent) setPolicyLoading(false);
      }
    },
    []
  );

  const fetchVendorProducts = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const { silent = false } = opts;
      try {
        if (!silent) setLoading(true);

        const numericVendorId = parseInt(vendorId, 10);
        const allProducts = await getProducts({ per_page: 100 });

        const vendorProducts = allProducts.filter(
          (product) => product.store && product.store.id === numericVendorId
        );

        setProducts(vendorProducts);

        if (vendorProducts.length > 0 && vendorProducts[0].store) {
          setVendorInfo(vendorProducts[0].store);
        }
      } catch (error) {
        console.error('Error fetching vendor products:', error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [vendorId]
  );

  const fetchVendorDetails = useCallback(async () => {
    const numericVendorId = Number(vendorId);
    if (!numericVendorId || Number.isNaN(numericVendorId)) {
      setVendorDetails(null);
      return;
    }
    try {
      const data = await getVendorById(numericVendorId);
      setVendorDetails(data);
    } catch (error) {
      console.error('Error fetching vendor details:', error);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchVendorProducts();
    fetchVendorDetails();
  }, [fetchVendorProducts, fetchVendorDetails]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchVendorProducts({ silent: true }),
        fetchPolicies(true, { silent: true }),
        fetchVendorDetails(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchVendorDetails, fetchVendorProducts, fetchPolicies]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: loading,
    targetRef: scrollRef,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <div className="animate-spin w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading store...</p>
          </div>
        </div>
      </main>
    );
  }

  const vendorSlugFromInfo = vendorInfo?.url?.split('/').pop();
  const friendlySlugName = humanizeSlug(vendorDetails?.store_slug) || humanizeSlug(vendorSlugFromInfo);
  const vendorName =
    vendorDetails?.store_name ||
    vendorDetails?.vendor_shop_name ||
    vendorDetails?.vendor_display_name ||
    vendorInfo?.shop_name ||
    vendorInfo?.name ||
    friendlySlugName ||
    'Vendor Store';
  const vendorEmailLabel =
    vendorDetails?.vendor_email ||
    vendorDetails?.email ||
    vendorDetails?.store_email ||
    'Email not available';
  const vendorAddressRaw =
    vendorDetails?.vendor_address ||
    vendorDetails?.store_address ||
    vendorDetails?.address;
  const vendorAddressText = formatVendorAddress(vendorAddressRaw);
  const ratingAverage = vendorDetails?.rating?.avg || vendorDetails?.rating?.rating || null;
  const ratingValue = ratingAverage ? Math.min(5, Math.max(0, Number(ratingAverage))) : 0;
  const ratingDisplay = ratingAverage ? ratingAverage : 'N/A';
  const vendorImage =
    vendorDetails?.banner ||
    vendorDetails?.gravatar ||
    vendorDetails?.store_logo ||
    vendorDetails?.logo ||
    null;
  const vendorAvatarStyle = vendorImage
    ? {
        backgroundImage: `url(${vendorImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;
  const freeShippingThreshold = policies?.shippingPolicy?.freeShippingThreshold ?? 0;
  const shippingDescription = policies?.shippingPolicy?.description;
  const shippingText = policies?.shippingPolicy
    ? freeShippingThreshold > 0
      ? shippingDescription?.toLowerCase().includes('free shipping on orders over')
        ? shippingDescription
        : `Free shipping on orders over ${formatPrice(freeShippingThreshold)}.${shippingDescription ? ` ${shippingDescription}` : ''}`
      : shippingDescription || 'Shipping details will appear here once available.'
    : 'Shipping details will appear here once available.';

  return (
    <main
      ref={scrollRef}
      className="min-h-screen bg-gray-50 pb-24 md:pb-8 overscroll-contain"
      style={{ touchAction: 'pan-y' }}
    >
      <div className="container mx-auto px-4 py-6">
        {(pullDistance > 0 || isRefreshing || refreshing) && (
          <div
            className="flex justify-center mb-2 transition-transform duration-150"
            style={{ transform: `translateY(${Math.min(pullDistance, 40)}px)` }}
          >
            <div className="flex items-center gap-2 rounded-full bg-white shadow px-3 py-1 text-xs text-gray-700">
              <span
                className={`h-2 w-2 rounded-full ${
                  isRefreshing || refreshing ? 'bg-primary-600 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span>
                {isRefreshing || refreshing
                  ? 'Refreshing store...'
                  : pullDistance >= 70
                  ? 'Release to refresh'
                  : 'Pull to refresh'}
              </span>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <a href="/" className="hover:text-primary-600">Home</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Store: {vendorName}</span>
        </nav>

        {/* Vendor Header Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Vendor Logo/Icon */}
            <div className="flex-shrink-0">
              <div
                className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center ${
                  vendorImage
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'bg-gradient-to-br from-primary-500 to-primary-700'
                }`}
                style={vendorAvatarStyle}
              >
                {!vendorImage && (
                  <Store className="w-12 h-12 md:w-16 md:h-16 text-white" />
                )}
              </div>
            </div>

            {/* Vendor Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {vendorName}
              </h1>
              
              <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    className={`w-5 h-5 ${ratingValue > idx ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {ratingAverage ? `(${ratingAverage} rating)` : '(No ratings yet)'}
              </span>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{products.length}</p>
                  <p className="text-xs text-gray-600">Products</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{ratingDisplay}</p>
                  <p className="text-xs text-gray-600">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">95%</p>
                  <p className="text-xs text-gray-600">Positive</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">24h</p>
                  <p className="text-xs text-gray-600">Response</p>
                </div>
              </div>
              <div className="border-t border-gray-100 mt-6 pt-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary-600 mt-1" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{vendorEmailLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-1" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-500">Address</p>
                      <p className="text-sm font-medium text-gray-900">{vendorAddressText}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              All Products ({products.length})
            </h2>
            
            <select className="px-4 py-2 border border-gray-300 rounded-lg text-sm">
              <option>Latest</option>
              <option>Popular</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
            </select>
          </div>

          {products.length > 0 ? (
            <ProductGrid products={products} columns={4} />
          ) : (
            <div className="text-center py-16 bg-white rounded-lg">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Products Yet
              </h3>
              <p className="text-gray-600 mb-6">
                This store hasn't added any products yet. Check back soon!
              </p>
              <a
                href="/"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Browse Other Stores
              </a>
            </div>
          )}
        </div>

        {/* Store Policies */}
        {products.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Return Policy</h3>
              {policyLoading ? (
                <p className="text-sm text-gray-500">Loading policy...</p>
              ) : (
                <p className="text-sm text-gray-600">
                  {policies?.returnPolicy?.enabled
                    ? `${policies.returnPolicy.days}-day return window. ${policies.returnPolicy.description}`
                    : 'Returns are currently unavailable for this store.'}
                </p>
              )}
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Shipping</h3>
              {policyLoading ? (
                <p className="text-sm text-gray-500">Loading shipping policy...</p>
              ) : (
                <p className="text-sm text-gray-600">{shippingText}</p>
              )}
            </div>
            
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Customer Service</h3>
              <p className="text-sm text-gray-600">
                Responds within 24 hours. Available Monday-Saturday, 9am-6pm.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
