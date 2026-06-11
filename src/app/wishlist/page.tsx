'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, ArrowLeft, Trash2, Share2, X } from 'lucide-react';
import PageHeader from '@/components/layout/page-header';
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
      <div className="container-custom min-w-0 py-5 md:py-6">
        <PageHeader
          title="My Wishlist"
          subtitle={`${itemCount} ${itemCount === 1 ? 'item' : 'items'} saved`}
          backHref="/"
          backLabel="Continue shopping"
        />

        {itemCount === 0 ? (
          <div className="text-center py-12 md:py-16 bg-white rounded-2xl shadow-sm p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
            <p className="text-xs md:text-sm text-gray-600 mb-5">Save items you love by clicking the heart icon</p>
            <Link href="/">
              <Button variant="primary" size="sm">Start Shopping</Button>
            </Link>
          </div>
        ) : (
          <div>
            <div className="bg-white rounded-2xl p-3 md:p-4 mb-4 md:mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-sm">
              <p className="text-xs md:text-sm text-gray-700">
                <span className="font-semibold text-primary-600">{itemCount}</span>{' '}
                {itemCount === 1 ? 'item' : 'items'} in your wishlist
              </p>
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={handleAddAllToCart}>
                  <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                  Add All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item) => {
                const isAddingThisItem = addingToCart === item.productId;
                return (
                  <div
                    key={item.productId}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
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

                    <div className="p-3 md:p-4">
                      <Link href={`/product/${item.slug}`} className="block">
                        <h3 className="font-semibold text-sm md:text-base text-gray-900 mb-1.5 line-clamp-2 hover:text-primary-600 transition-colors min-h-[40px]">
                          {item.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base md:text-lg font-bold text-primary-600">
                          {formatPrice(item.price)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2.5">
                        Added {new Date(item.addedAt).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          onClick={() => handleAddToCart(item)}
                          isLoading={isAddingThisItem}
                        >
                          {isAddingThisItem ? (
                            <>Adding...</>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                              Add to Cart
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.productId)}
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                className="inline-flex items-center gap-2 text-xs md:text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
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
