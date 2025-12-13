'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Store, MapPin, Star, Mail, Phone } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { getProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';
import { getStorePolicies, StorePolicies } from '@/lib/woocommerce/policies';
import { formatPrice } from '@/lib/utils/format-price';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { getVendorById } from '@/lib/woocommerce/vendors';
import type { Vendor } from '@/types/vendor';

const humanizeSlug = (value?: string) => {
  if (!value) return undefined;
  return value
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
};

export default function VendorStorePage() {
  const params = useParams();
  const vendorId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorDetails, setVendorDetails] = useState<Vendor | null>(null);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
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

        const numericVendorId = Number(vendorId);
        if (isNaN(numericVendorId)) {
          console.error('Invalid vendor ID');
          setLoading(false);
          return;
        }

        // Fetch vendor details using the new custom endpoint
        const details = await getVendorById(numericVendorId);
        
        console.log('===== VENDOR DATA FROM CUSTOM ENDPOINT =====');
        console.log('Full vendor object:', details);
        console.log('Email:', details?.vendor_email || details?.email);
        console.log('Phone:', details?.phone);
        console.log('Address object:', details?.vendor_address);
        console.log('Address string:', details?.address);
        console.log('===========================================');
        
        setVendorDetails(details);

        // Fetch all products
        const allProducts = await getProducts({ per_page: 100 });

        // Filter products by this vendor
        const vendorProducts = allProducts.filter((p) => {
          if (p.store?.id === numericVendorId) {
            return true;
          }

          const storeVendorId = p.meta_data?.find((m) =>
            ['_wcfm_vendor_id', '_wcfmmp_vendor_id', '_vendor_id', 'vendor_id'].includes(m.key)
          )?.value;

          return storeVendorId && Number(storeVendorId) === numericVendorId;
        });

        setProducts(vendorProducts);

        // Extract vendor info from first product if available (fallback)
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

  useEffect(() => {
    fetchVendorProducts();
    fetchPolicies();
  }, [fetchVendorProducts, fetchPolicies]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchVendorProducts({ silent: true }),
      fetchPolicies(true, { silent: true }),
    ]);
    setRefreshing(false);
  };

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 70,
    scrollableRef: scrollRef,
  });

  if (loading && !refreshing) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading store...</p>
          </div>
        </div>
      </main>
    );
  }

  // Get vendor name - prioritize custom endpoint data
  const vendorSlugFromUrl = vendorInfo?.url?.split('/').pop();
  const vendorName =
    vendorDetails?.store_name ||
    vendorDetails?.vendor_shop_name ||
    vendorDetails?.vendor_display_name ||
    vendorInfo?.shop_name ||
    vendorInfo?.name ||
    humanizeSlug(vendorDetails?.store_slug) ||
    humanizeSlug(vendorSlugFromUrl) ||
    'Vendor Store';

  // Contact details from custom endpoint
  const vendorEmail = vendorDetails?.vendor_email || vendorDetails?.email;
  const vendorPhone = vendorDetails?.phone;
  const vendorAddressObj = vendorDetails?.vendor_address;
  const vendorAddressString = vendorDetails?.address;

  // Format address
  let vendorAddress = vendorAddressString;
  if (!vendorAddress && vendorAddressObj) {
    const parts = [
      vendorAddressObj.street_1,
      vendorAddressObj.street_2,
      vendorAddressObj.city,
      vendorAddressObj.state,
      vendorAddressObj.zip,
      vendorAddressObj.country,
    ].filter(Boolean);
    vendorAddress = parts.length > 0 ? parts.join(', ') : undefined;
  }

  // Get avatar/image - prioritize custom endpoint data
  const vendorImage =
    vendorDetails?.banner ||
    vendorDetails?.gravatar ||
    vendorDetails?.store_logo ||
    vendorDetails?.logo ||
    vendorInfo?.banner ||
    vendorInfo?.icon ||
    vendorInfo?.gravatar ||
    null;

  const vendorAvatarStyle = vendorImage
    ? {
        backgroundImage: `url(${vendorImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  // Rating from custom endpoint or product store
  const ratingAverage = 
    vendorDetails?.rating?.avg || 
    vendorDetails?.rating?.rating || 
    vendorInfo?.rating?.avg || 
    vendorInfo?.rating || 
    null;
  const ratingValue = ratingAverage ? Math.min(5, Math.max(0, Number(ratingAverage))) : 0;
  const ratingDisplay = ratingAverage ? ratingAverage : 'N/A';

  // Bio/description
  const vendorBio = vendorDetails?.shop_description;

  const freeShippingThreshold = policies?.shippingPolicy?.freeShippingThreshold ?? 0;
  const shippingDescription = policies?.shippingPolicy?.description;
  const shippingText = policies?.shippingPolicy
    ? freeShippingThreshold > 0
      ? shippingDescription?.toLowerCase().includes('free shipping on orders over')
        ? shippingDescription
        : `Free shipping on orders over ${formatPrice(freeShippingThreshold)}.${shippingDescription ? ` ${shippingDescription}` : ''}`
      : shippingDescription || 'Shipping details will appear here once available.'
    : 'Shipping details will appear here once available.';

  // Check if we have any contact info to show
  const hasContactInfo = vendorEmail || vendorPhone || vendorAddress;

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
                  isRefreshing || refreshing
                    ? 'bg-primary-600 animate-pulse'
                    : 'bg-gray-400'
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

        {/* DEBUG INFO - Remove this after fixing */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-yellow-900 mb-2">🐛 Debug Info:</h3>
          <div className="text-xs space-y-1">
            <p><strong>Vendor ID:</strong> {vendorId}</p>
            <p><strong>Email:</strong> {vendorEmail || 'NOT FOUND'}</p>
            <p><strong>Phone:</strong> {vendorPhone || 'NOT FOUND'}</p>
            <p><strong>Address String:</strong> {vendorAddressString || 'NOT FOUND'}</p>
            <p><strong>Address Object:</strong> {vendorAddressObj ? JSON.stringify(vendorAddressObj) : 'NOT FOUND'}</p>
            <p><strong>Computed Address:</strong> {vendorAddress || 'NOT FOUND'}</p>
            <p><strong>Has Contact Info:</strong> {hasContactInfo ? 'YES' : 'NO'}</p>
            <p className="mt-2"><strong>Full vendorDetails:</strong></p>
            <pre className="bg-white p-2 rounded text-xs overflow-auto max-h-40">
              {JSON.stringify(vendorDetails, null, 2)}
            </pre>
          </div>
        </div>

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
              
              {vendorBio && (
                <p className="text-gray-600 text-sm mb-3">{vendorBio}</p>
              )}
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-5 h-5 ${
                        ratingValue > idx
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
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
              
              {/* Contact Information - From Custom Vendor Endpoint */}
              {hasContactInfo ? (
                <div className="border-t border-gray-100 mt-6 pt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {vendorEmail && (
                      <div className="flex items-start gap-3">
                        <Mail className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
                          <a 
                            href={`mailto:${vendorEmail}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {vendorEmail}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {vendorPhone && (
                      <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
                          <a 
                            href={`tel:${vendorPhone}`}
                            className="text-sm font-medium text-gray-900 hover:text-primary-600"
                          >
                            {vendorPhone}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    {vendorAddress && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="w-5 h-5 text-primary-600 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500">Address</p>
                          <p className="text-sm font-medium text-gray-900">{vendorAddress}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 mt-6 pt-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <p className="text-sm text-orange-800">
                      ⚠️ No contact information available for this vendor. 
                      Check the debug box above to see what data is being returned.
                    </p>
                  </div>
                </div>
              )}
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
            <ProductGrid products={products} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">No products available from this vendor yet.</p>
            </div>
          )}
        </div>

        {/* Store Policies */}
        {policies && (
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Store Policies</h2>
            
            <div className="space-y-6">
              {/* Shipping */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Shipping Policy</h3>
                <p className="text-gray-600 text-sm">{shippingText}</p>
              </div>

              {/* Return */}
              {policies.returnPolicy && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Return Policy</h3>
                  <p className="text-gray-600 text-sm">
                    {policies.returnPolicy.enabled 
                      ? `${policies.returnPolicy.days}-day return policy. ${policies.returnPolicy.description}`
                      : 'Returns not accepted'}
                  </p>
                </div>
              )}

              {/* Cancellation */}
              {policies.cancellationPolicy && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Cancellation Policy</h3>
                  <p className="text-gray-600 text-sm">{policies.cancellationPolicy.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}