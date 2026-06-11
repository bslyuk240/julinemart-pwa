'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Share2, X } from 'lucide-react';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCart } from '@/hooks/use-cart';
import { Button } from '@/components/ui/button';

export default function WishlistPage() {
  const { items, removeItem, clearWishlist, itemCount } = useWishlist();
  const { addItem } = useCart();
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const handleAddToCart = (item: typeof items[0]) => {
    setAddingToCart(item.productId);
    addItem(
      {
        id: item.productId,
        name: item.name,
        slug: item.slug,
        price: item.price,
        regular_price: item.price,
        sale_price: '',
        on_sale: false,
        stock_status: 'instock',
        images: [{ src: item.image, alt: item.name, id: 0 }],
        categories: [],
        description: '',
        short_description: '',
        sku: '',
        manage_stock: false,
        stock_quantity: null,
        attributes: [],
        variations: [],
        type: 'simple',
        status: 'publish',
        featured: false,
        catalog_visibility: 'visible',
        average_rating: '0',
        rating_count: 0,
        related_ids: [],
        tags: [],
      } as any,
      1
    );
    setTimeout(() => setAddingToCart(null), 1000);
  };

  const handleAddAllToCart = () => {
    items.forEach((item) => handleAddToCart(item));
  };

  const handleShare = async (item: typeof items[0]) => {
    const url = `${window.location.origin}/product/${item.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.name, text: `Check out ${item.name} on JulineMart`, url });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      alert('Product link copied to clipboard!');
    }
  };

  const formatPrice = (price: string) =>
    `₦${parseFloat(String(price) || '0').toLocaleString()}`;

  return (
    <main className="min-h-screen overflow-x-hidden bg-gray-50 pb-24 md:pb-8">
      <div className="container-custom min-w-0 py-6">
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Wishlist</h1>
            <p className="text-sm text-gray-600 mt-1">
              {itemCount} {itemCount === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        {itemCount === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg shadow-sm">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
              <Heart className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-600 mb-6">Save items you love by clicking the heart icon</p>
            <Link
              href="/"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div>
            {/* Action Bar */}
            <div className="bg-white rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
              <p className="text-gray-700">
                <span className="font-semibold text-primary-600">{itemCount}</span>{' '}
                {itemCount === 1 ? 'item' : 'items'} in your wishlist
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={handleAddAllToCart}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add All to Cart
                </Button>
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
              </div>
            </div>

            {/* Wishlist Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => {
                const isAddingThisItem = addingToCart === item.productId;
                return (
                  <div
                    key={item.productId}
                    className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="relative">
                      <Link href={`/product/${item.slug}`}>
                        <div className="relative aspect-square overflow-hidden bg-gray-100">
                          <Image
                            src={item.image || '/images/placeholder.svg'}
                            alt={item.name}
                            fill
                            className="object-cover transition-transform duration-200 hover:scale-105"
                          />
                        </div>
                      </Link>
                      <div className="absolute top-2 right-2 flex flex-col gap-2">
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors group"
                          title="Remove from wishlist"
                        >
                          <X className="w-4 h-4 text-gray-600 group-hover:text-red-600" />
                        </button>
                        <button
                          onClick={() => handleShare(item)}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md transition-colors"
                          title="Share product"
                        >
                          <Share2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <Link href={`/product/${item.slug}`} className="block">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600 transition-colors min-h-[48px]">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-bold text-primary-600">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="md"
                          fullWidth
                          onClick={() => handleAddToCart(item)}
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
                          onClick={() => removeItem(item.productId)}
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

            <div className="text-center mt-8">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Continue Shopping
              </Link>
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Wishlist Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Items in your wishlist are saved for future purchases</li>
                <li>• Products may sell out — add to cart to secure them</li>
                <li>• Share your wishlist with friends and family</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
