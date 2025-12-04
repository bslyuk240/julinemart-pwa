'use client';

import { useCallback, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Store, MapPin, Star, Phone, Mail } from 'lucide-react';
import ProductGrid from '@/components/product/product-grid';
import { getProducts } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';
import { getStorePolicies, StorePolicies } from '@/lib/woocommerce/policies';
import { formatPrice } from '@/lib/utils/format-price';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

export default function VendorStorePage() {
  const params = useParams();
  const vendorId = params.id as string;
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [policies, setPolicies] = useState<StorePolicies | null>(null);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPolicies = async (forceRefresh = false, opts: { silent?: boolean } = {}) => {
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
  };

  const fetchVendorProducts = async (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    try {
      if (!silent) setLoading(true);

      // Fetch all products and filter by vendor
      const allProducts = await getProducts({ per_page: 100 });
      
      // Filter products by this vendor
      const vendorProducts = allProducts.filter(product => 
        product.store && product.store.id === parseInt(vendorId)
      );
      
      setProducts(vendorProducts);
      
      // Get vendor info from first product
      if (vendorProducts.length > 0 && vendorProducts[0].store) {
        setVendorInfo(vendorProducts[0].store);
      }
      
    } catch (error) {
      console.error('Error fetching vendor products:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorProducts();
  }, [vendorId]);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchVendorProducts({ silent: true }),
        fetchPolicies(true, { silent: true }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [vendorId]);

  const { pullDistance, isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    disabled: loading,
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

  const vendorName = vendorInfo?.shop_name || vendorInfo?.name || 
    vendorInfo?.url?.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 
    'Vendor Store';
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
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
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
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
                <Store className="w-12 h-12 md:w-16 md:h-16 text-white" />
              </div>
            </div>

            {/* Vendor Info */}
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {vendorName}
              </h1>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  <Star className="w-5 h-5 text-gray-300" />
                </div>
                <span className="text-sm text-gray-600">(4.0 rating)</span>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 text-gray-700">
                  <Store className="w-5 h-5 text-primary-600" />
                  <span className="text-sm">{products.length} Products</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">{products.length}</p>
                  <p className="text-xs text-gray-600">Products</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary-600">4.0</p>
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

