'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star, BadgeCheck } from 'lucide-react';
import { Product } from '@/types/product';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { toast } from 'sonner';
import { decodeHtmlEntities } from '@/lib/utils/helpers';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  fullWidth?: boolean;
  floatingBadge?: React.ReactNode;
}

export default function ProductCard({ 
  product, 
  showBadge = false, 
  fullWidth = false,
  floatingBadge 
}: ProductCardProps) {
  const decodedName = decodeHtmlEntities(product.name);
  const { addItem } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const inWishlist = isInWishlist(product.id);
  
  // Price handling
  const price = parseFloat(product.price || '0');
  const regularPrice = parseFloat(product.regular_price || product.price || '0');
  const outOfStock = product.stock_status === 'outofstock';
  
  // Rating handling
  const rating = parseFloat(product.average_rating || '0');

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Add to cart handler
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (outOfStock) return;

    setIsAddingToCart(true);
    try {
      addItem(product, 1);
      toast.success('Added to cart!');
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  // Wishlist toggle handler
  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const added = toggleWishlist(product.id, product);
    if (added) {
      toast.success('Added to wishlist');
    } else {
      toast.success('Removed from wishlist');
    }
  };

  // Check if vendor is official
  // Method 1: Check for official-store tag
  const hasOfficialTag = product.tags?.some(tag => tag.slug === 'official-store');
  
  // Method 2: Check vendor type (if you add it to your backend)
  // const hasVendorType = product.store?.vendor_type === 'official';
  
  const isOfficialStore = hasOfficialTag; // Or: hasOfficialTag || hasVendorType

  // Get product badges from tags (like "Black Friday deal", "Flash Sale", etc.)
  const productBadges = product.tags?.filter(tag => 
    ['flash-sale', 'deal', 'featured', 'new-arrival', 'black-friday'].includes(tag.slug)
  ) || [];

  // Badge configuration
  const getBadgeConfig = (tagSlug: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      'flash-sale': { label: 'Flash Sale', color: 'bg-red-500' },
      'deal': { label: 'Deal', color: 'bg-orange-500' },
      'featured': { label: 'Featured', color: 'bg-purple-500' },
      'new-arrival': { label: 'New', color: 'bg-green-500' },
      'black-friday': { label: 'Black Friday', color: 'bg-black' },
    };
    return configs[tagSlug] || { label: tagSlug, color: 'bg-gray-500' };
  };

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`block group ${fullWidth ? 'w-full' : 'max-w-[220px]'}`}
    >
      <div className="relative bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        {/* Badges Section - Top of Image */}
        <div className="absolute top-2 left-2 right-2 z-10 flex flex-col gap-1">
          {/* Official Store Badge */}
          {isOfficialStore && (
            <div className="inline-flex items-center gap-1 bg-blue-600 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-lg w-fit">
              <BadgeCheck className="w-3 h-3 md:w-3.5 md:h-3.5" />
              Official Store
            </div>
          )}

          {/* Product Tag Badges */}
          {productBadges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {productBadges.map((tag) => {
                const config = getBadgeConfig(tag.slug);
                return (
                  <span
                    key={tag.id}
                    className={`${config.color} text-white text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-md shadow-lg`}
                  >
                    {config.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Sale Badge - Top Right (only if showBadge is true) */}
        {showBadge && product.on_sale && !productBadges.length && (
          <div className="absolute top-2 right-2 z-10">
            <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
              SALE
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-2 right-2 z-20 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-50 transition-colors"
          aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart 
            className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`}
            fill={inWishlist ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>

        {/* Optional floating badge on the image */}
        {floatingBadge && (
          <div className="absolute bottom-2 right-2 z-10">
            {floatingBadge}
          </div>
        )}

        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50">
          <Image
            src={product.images[0]?.src || '/images/placeholder.jpg'}
            alt={decodedName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 220px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="p-2 md:p-4 space-y-1 md:space-y-2">
        {/* Vendor Name (if available) */}
        {product.store?.shop_name && (
          <p className="text-[10px] md:text-xs text-gray-500 truncate">
            {product.store.shop_name}
          </p>
        )}

        {/* Title */}
        <h3 className="line-clamp-2 
          text-xs md:text-sm 
          font-semibold text-gray-900 leading-tight 
          min-h-[32px] md:min-h-[40px]">
          {decodedName}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-1 md:gap-2">
          <span className="text-sm md:text-lg font-bold text-primary-700">
            {formatCurrency(price)}
          </span>
          {regularPrice > price && (
            <span className="text-[10px] md:text-sm text-gray-400 line-through">
              {formatCurrency(regularPrice)}
            </span>
          )}
        </div>

        {/* Rating & Stock */}
        <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-500">
          <span className="flex items-center gap-0.5 md:gap-1">
            <Star className="h-2.5 w-2.5 md:h-4 md:w-4 text-yellow-400" fill="currentColor" />
            <span>{rating.toFixed(1)}</span>
            <span className="hidden md:inline">({product.rating_count ?? 0})</span>
          </span>
          <span className={`font-medium ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>
            {outOfStock ? 'Out' : 'In stock'}
          </span>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          disabled={outOfStock || isAddingToCart}
          onClick={handleAddToCart}
          className="w-full flex items-center justify-center gap-1 md:gap-2 
            bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 
            text-white 
            text-[10px] md:text-sm 
            font-medium 
            py-1.5 md:py-2 
            rounded transition-colors"
        >
          <ShoppingCart className="h-3 w-3 md:h-4 md:w-4" />
          <span className="md:hidden">{outOfStock ? 'Out' : isAddingToCart ? 'Adding...' : 'Add'}</span>
          <span className="hidden md:inline">{outOfStock ? 'Unavailable' : isAddingToCart ? 'Adding...' : 'Add to Cart'}</span>
        </button>
      </div>
    </Link>
  );
}
