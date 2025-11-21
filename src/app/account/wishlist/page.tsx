'use client';

import Link from 'next/link';
import { Heart, ShoppingCart, ArrowLeft } from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCart } from '@/hooks/use-cart';
import ProductCard from '@/components/product/product-card';
import { Button } from '@/components/ui/button';
import { dummyProducts } from '@/lib/dummy-data';

export default function WishlistPage() {
  const { items, itemCount } = useWishlist();
  const { addItem } = useCart();

  // Get full product details for wishlist items
  const wishlistProducts = items.map((item) => 
    dummyProducts.find((p) => p.id === item.id)
  ).filter(Boolean);

  const handleMoveToCart = (productId: number) => {
    const product = wishlistProducts.find((p) => p?.id === productId);
    if (product) {
      addItem({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        regularPrice: product.regular_price,
        image: product.images[0]?.src || '/images/placeholder.jpg',
        quantity: 1,
        stockStatus: product.stock_status,
        stockQuantity: product.stock_quantity,
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden md:inline">Continue Shopping</span>
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            My Wishlist ({itemCount})
          </h1>
        </div>

        {itemCount === 0 ? (
          /* Empty Wishlist */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Your wishlist is empty
            </h2>
            <p className="text-gray-600 mb-6">
              Save items you love for later
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
            <div className="bg-white rounded-lg p-4 mb-6 flex items-center justify-between">
              <p className="text-gray-700">
                <span className="font-semibold">{itemCount}</span> {itemCount === 1 ? 'item' : 'items'} in your wishlist
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Add all to cart functionality
                  wishlistProducts.forEach((product) => {
                    if (product) handleMoveToCart(product.id);
                  });
                }}
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add All to Cart
              </Button>
            </div>

            {/* Wishlist Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {wishlistProducts.map((product) => (
                product && (
                  <div key={product.id} className="relative">
                    <ProductCard product={product} />
                    
                    {/* Move to Cart Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      fullWidth
                      className="mt-2"
                      onClick={() => handleMoveToCart(product.id)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                )
              ))}
            </div>

            {/* Continue Shopping */}
            <div className="text-center mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}