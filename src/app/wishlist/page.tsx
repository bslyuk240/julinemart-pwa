'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Share2, X } from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';
import { getProduct } from '@/lib/woocommerce/products';
import { Product } from '@/types/product';
import PageLoading from '@/components/ui/page-loading';

export default function WishlistPage() {
  const { items, removeItem, clearWishlist, itemCount } = useWishlist();
  const { addItem } = useCart();
  const [products, setProducts] = useState<(Product | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  // Fetch full product details for wishlist items
  useEffect(() => {
    const fetchProducts = async () => {
      if (items.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const productPromises = items.map(item => 
          getProduct(item.productId).catch(() => null)
        );
        const fetchedProducts = await Promise.all(productPromises);
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching wishlist products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [items]);

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);
    addItem(product, 1);
    setTimeout(() => setAddingToCart(null), 1000);
  };

  const handleAddAllToCart = () => {
    products.forEach((product) => {
      if (product && product.stock_status === 'instock') {
        addItem(product, 1);
      }
    });
  };

  const handleRemove = (productId: number) => {
    removeItem(productId);
  };

  const handleShare = async (product: Product) => {
    const url = `${window.location.origin}/product/${product.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on JulineMart`,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Product link copied to clipboard!');
    }
  };

  const formatPrice = (price: string) => {
    return `₦${parseFloat(price).toLocaleString()}`;
  };

  const calculateDiscount = (regular: string, sale: string) => {
    const regularPrice = parseFloat(regular);
    const salePrice = parseFloat(sale);
    if (!regularPrice || !salePrice || regularPrice <= salePrice) return 0;
    return Math.round(((regularPrice - salePrice) / regularPrice) * 100);
  };

  if (loading) {
    return <PageLoading text="Loading your wishlist..." />;
  }

  const availableProducts = products.filter(p => p?.stock_status === 'instock');

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Continue Shopping</span>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Wishlist
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {itemCount === 0 ? (
          /* Empty Wishlist */
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-6">
              Save items you love by clicking the heart icon
            </p>
            <Link
              href="/"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          /* Wishlist with Items */
          <div>
            {/* Action Bar */}
            <div className="bg-white rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <p className="text-gray-700">
                  <span className="font-semibold text-primary-600">{itemCount}</span> 
                  {' '}{itemCount === 1 ? 'item' : 'items'} in your wishlist
                </p>
                {availableProducts.length > 0 && (
                  <span className="text-sm text-green-600 font-medium">
                    {availableProducts.length} available
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                {availableProducts.length > 0 && (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleAddAllToCart}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add All to Cart
                  </Button>
                )}
                
                {itemCount > 0 && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {
                      if (confirm('Are you sure you want to clear your wishlist?')) {
                        clearWishlist();
                      }
                    }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {/* Wishlist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product, index) => {
                if (!product) return null;

                const wishlistItem = items[index];
                const isAddingThisItem = addingToCart === product.id;
                const discountPercent = product.on_sale && product.regular_price 
                  ? calculateDiscount(product.regular_price, product.price)
                  : 0;

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Product Image */}
                    <div className="relative">
                      <Link href={`/product/${product.slug}`}>
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={product.images[0]?.src || '/images/placeholder.jpg'}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-200 hover:scale-105"
                          />
                          
                          {/* Badges */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1">
                            {discountPercent > 0 && (
                              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                                -{discountPercent}%
                              </span>
                            )}
                            {product.stock_status !== 'instock' && (
                              <span className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded">
                                Out of Stock
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Quick Actions */}
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        <button
                          onClick={() => handleRemove(product.id)}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors group"
                          title="Remove from wishlist"
                        >
                          <X className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                        </button>
                        
                        <button
                          onClick={() => handleShare(product)}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                          title="Share product"
                        >
                          <Share2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <Link 
                        href={`/product/${product.slug}`}
                        className="block"
                      >
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors min-h-[48px]">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Price */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold text-primary-600">
                          {formatPrice(product.price)}
                        </span>
                        {product.on_sale && product.regular_price && (
                          <span className="text-sm text-gray-400 line-through">
                            {formatPrice(product.regular_price)}
                          </span>
                        )}
                      </div>

                      {/* Stock Status */}
                      {product.stock_status === 'instock' ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span>In Stock</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-red-600 mb-3">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>Out of Stock</span>
                        </div>
                      )}

                      {/* Added Date */}
                      {wishlistItem && (
                        <p className="text-xs text-gray-500 mb-3">
                          Added {new Date(wishlistItem.addedAt).toLocaleDateString()}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock_status !== 'instock' || isAddingThisItem}
                          isLoading={isAddingThisItem}
                        >
                          {isAddingThisItem ? (
                            <>Adding...</>
                          ) : (
                            <>
                              <ShoppingCart className="w-4 h-4 mr-2" />
                              Add to Cart
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          size="md"
                          onClick={() => handleRemove(product.id)}
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue Shopping */}
            <div className="text-center mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>

            {/* Info Card */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Wishlist Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Items in your wishlist are saved for future purchases</li>
                <li>• You'll be notified when items go on sale</li>
                <li>• Share your wishlist with friends and family</li>
                <li>• Products may sell out - add to cart to secure them</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}