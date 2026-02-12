'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Store, Star } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { Product } from '@/types/product';
import { getStorePolicies, StorePolicies } from '@/lib/woocommerce/policies';
import { formatPrice } from '@/lib/utils/format-price';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getVendorById, getVendorProducts, getVendorProductCount } from '@/lib/woocommerce/vendors-custom';
import type { Vendor } from '@/types/vendor';

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
  const [productCount, setProductCount] = useState<number | null>(null);
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
        
        // ✅ Check vendor status first
        const vendorData = await getVendorById(numericVendorId);
        setVendorDetails(vendorData);
        
        // ✅ If vendor is disabled or on vacation, don't fetch products
        if (vendorData) {
          if (vendorData.enabled === false) {
            console.log('⚠️ Vendor is disabled');
            setProducts([]);
            setProductCount(0);
            if (!silent) setLoading(false);
            return;
          }

          if (vendorData.is_store_vacation === true) {
            console.log('🏖️ Vendor is on vacation');
            setProducts([]);
            setProductCount(0);
            if (!silent) setLoading(false);
            return;
          }
        }

        // Use backend vendor product count for accurate count, then fetch by product IDs
        const [countData, vendorProducts] = await Promise.all([
          getVendorProductCount(numericVendorId),
          getVendorProducts(numericVendorId),
        ]);

        if (countData?.product_count != null) {
          setProductCount(countData.product_count);
        } else {
          setProductCount(vendorProducts.length);
        }

        setProducts(vendorProducts);

        if (vendorProducts.length > 0 && vendorProducts[0].store) {
          setVendorInfo(vendorProducts[0].store);
        } else if (vendorData) {
          setVendorInfo({
            id: vendorData.id,
            name: vendorData.store_name,
            shop_name: vendorData.store_name,
            url: vendorData.store_slug ? `/store/${vendorData.store_slug}` : '',
          });
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
      
      // Debug logging for avatar/banner
      console.log('🖼️ Vendor Images:', {
        id: data?.id,
        name: data?.store_name,
        // Avatar/Logo fields
        gravatar: data?.gravatar,
        logo: data?.logo,
        store_logo: data?.store_logo,
        // Banner field
        banner: data?.banner,
        enabled: data?.enabled,
      });
      
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

  // Loading state
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

  // ✅ Check if vendor is disabled
  if (vendorDetails && vendorDetails.enabled === false) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Store Unavailable</h2>
            <p className="text-gray-600 mb-6">
              This store is currently not accepting orders. Please check back later.
            </p>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Other Stores
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ✅ Check vacation mode
  if (vendorDetails && vendorDetails.is_store_vacation === true) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-20">
            <Store className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Store on Vacation</h2>
            <div className="max-w-md mx-auto">
              <p className="text-gray-600 mb-6">
                {vendorDetails.vacation_message || 
                  'This store is temporarily closed for vacation. Please check back soon!'}
              </p>
            </div>
            <Link 
              href="/"
              className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Other Stores
            </Link>
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
  
  const ratingAverage = vendorDetails?.rating?.avg || vendorDetails?.rating?.rating || null;
  const ratingValue = ratingAverage ? Math.min(5, Math.max(0, Number(ratingAverage))) : 0;
  const ratingDisplay = ratingAverage ? ratingAverage : 'N/A';
  
  // Debug: Log ALL vendor fields to find custom avatar/banner
  console.log('🖼️ Vendor Full Data:', vendorDetails);
  console.log('🖼️ Vendor Image Fields:', {
    vendorId: vendorDetails?.id,
    gravatar: vendorDetails?.gravatar,
    avatar: vendorDetails?.avatar,
    logo: vendorDetails?.logo,
    store_logo: vendorDetails?.store_logo,
    banner: vendorDetails?.banner,
    allImageKeys: vendorDetails ? Object.keys(vendorDetails).filter(k => 
      k.toLowerCase().includes('banner') || 
      k.toLowerCase().includes('logo') || 
      k.toLowerCase().includes('gravatar') || 
      k.toLowerCase().includes('avatar') || 
      k.toLowerCase().includes('image') ||
      k.toLowerCase().includes('icon')
    ) : []
  });

  // ✅ Avatar/Logo Priority (circular profile picture)
  // Custom uploaded logo takes priority over default Gravatar
  const vendorAvatar =
    vendorDetails?.logo ||          // Store logo (highest priority - custom uploaded)
    vendorDetails?.store_logo ||    // Alternative logo field
    vendorDetails?.avatar ||        // Avatar field
    vendorDetails?.gravatar ||      // Gravatar (fallback - often default icon)
    null;
  
  // ✅ Banner Image (cover/header image)
  const vendorBanner = vendorDetails?.banner || (vendorDetails as any)?.store_banner || null;

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

        {/* ✅ NEW: Banner Image (if available) */}
        {vendorBanner && (
          <div className="mb-6 rounded-lg overflow-hidden shadow-sm">
            <div 
              className="w-full h-48 md:h-64 bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${vendorBanner})`,
                backgroundColor: '#f3f4f6' // Fallback color
              }}
            />
          </div>
        )}

        {/* Vendor Header Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          {/* Mobile Layout */}
          <div className="md:hidden">
            {/* Header Section */}
            <div className="p-4 pb-3 border-b border-gray-100">
              {/* Logo and Store Name - Inline */}
              <div className="flex items-center gap-3 mb-3">
                {/* Vendor Avatar/Logo */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-gray-100 ${
                      vendorAvatar
                        ? 'bg-white'
                        : 'bg-gradient-to-br from-primary-500 to-primary-700'
                    }`}
                  >
                    {vendorAvatar ? (
                      <img 
                        src={vendorAvatar} 
                        alt={vendorName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.classList.add('bg-gradient-to-br', 'from-primary-500', 'to-primary-700');
                          const icon = document.createElement('div');
                          icon.innerHTML = '<svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0zm0 4a2 2 0 104 0 2 2 0 00-4 0z" clip-rule="evenodd"/></svg>';
                          e.currentTarget.parentElement!.appendChild(icon);
                        }}
                      />
                    ) : (
                      <Store className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
                
                {/* Store Name & Rating */}
                <div className="flex-1 min-w-0">
                  <h1 className="font-bold text-gray-900 mb-1 truncate" style={{ fontSize: '16px', lineHeight: '1.3' }}>
                    {vendorName}
                  </h1>
                  
                  {/* Rating - Compact */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3 h-3 ${ratingValue > idx ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-gray-500" style={{ fontSize: '11px' }}>
                      {ratingAverage ? `${ratingAverage}` : 'No ratings'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="px-4 py-3 bg-gray-50">
              <div className="flex items-center justify-between text-center">
                {/* Products */}
                <div className="flex-1">
                  <div className="font-bold text-primary-600" style={{ fontSize: '18px' }}>
                    {productCount != null ? productCount : products.length}
                  </div>
                  <div className="text-gray-600" style={{ fontSize: '11px' }}>
                    Products
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-8 w-px bg-gray-200"></div>
                
                {/* Positive */}
                <div className="flex-1">
                  <div className="font-bold text-green-600" style={{ fontSize: '18px' }}>
                    95%
                  </div>
                  <div className="text-gray-600" style={{ fontSize: '11px' }}>
                    Positive
                  </div>
                </div>
                
                {/* Divider */}
                <div className="h-8 w-px bg-gray-200"></div>
                
                {/* Response */}
                <div className="flex-1">
                  <div className="font-bold text-blue-600" style={{ fontSize: '18px' }}>
                    24h
                  </div>
                  <div className="text-gray-600" style={{ fontSize: '11px' }}>
                    Response
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex md:flex-col md:gap-6">
            <div className="flex gap-6">
              {/* Vendor Avatar/Logo */}
              <div className="flex-shrink-0">
                <div
                  className={`w-32 h-32 rounded-full flex items-center justify-center overflow-hidden ${
                    vendorAvatar
                      ? 'bg-white shadow-sm border-2 border-gray-200'
                      : 'bg-gradient-to-br from-primary-500 to-primary-700'
                  }`}
                >
                  {vendorAvatar ? (
                    <img 
                      src={vendorAvatar} 
                      alt={vendorName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.classList.add('bg-gradient-to-br', 'from-primary-500', 'to-primary-700');
                        const icon = document.createElement('div');
                        icon.innerHTML = '<svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0zm0 4a2 2 0 104 0 2 2 0 00-4 0z" clip-rule="evenodd"/></svg>';
                        e.currentTarget.parentElement!.appendChild(icon);
                      }}
                    />
                  ) : (
                    <Store className="w-16 h-16 text-white" />
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
                    <p className="text-2xl font-bold text-primary-600">
                      {productCount != null ? productCount : products.length}
                    </p>
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
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              All Products ({productCount != null ? productCount : products.length})
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
              <Link
                href="/"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
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