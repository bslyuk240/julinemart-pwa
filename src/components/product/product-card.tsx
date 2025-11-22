'use client';

import { MouseEvent, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Product } from '@/types/product';
import { useCart } from '@/hooks/use-cart';
import { useWishlist } from '@/hooks/use-wishlist';
import { Badge } from '../ui/badge';

interface ProductCardProps {
  product: Product;
  showBadge?: boolean;
  fullWidth?: boolean;
}

export default function ProductCard({ product, showBadge = false, fullWidth = false }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const price = useMemo(() => parseFloat(product.price) || 0, [product.price]);
  const regularPrice = useMemo(
    () => parseFloat(product.regular_price || product.price) || price,
    [product.regular_price, product.price, price]
  );
  const rating = parseFloat(product.average_rating) || 0;
  const outOfStock = product.stock_status !== 'instock';

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(value);

  const handleAddToCart = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsAddingToCart(true);
    addItem(product);
    setTimeout(() => setIsAddingToCart(false), 500);
  };

  const handleToggleWishlist = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(product.id, product);
  };

  const discountPercent = regularPrice > price 
    ? Math.round(((regularPrice - price) / regularPrice) * 100)
    : 0;

  return (
    <Link
      href={`/product/${product.slug}`}
      className={`block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ${
        fullWidth ? 'w-full' : 'w-[140px] sm:w-[150px] md:w-full flex-shrink-0 md:flex-shrink'
      }`}
    >
      <div className="relative">
        {/* Badges */}
        <div className="absolute top-1.5 md:top-3 left-1.5 md:left-3 z-10 flex flex-col gap-1">
          {showBadge && (
            <Badge variant="secondary" size="sm" className="text-[9px] md:text-xs px-1.5 md:px-2 py-0.5">
              Featured
            </Badge>
          )}
          {discountPercent > 0 && (
            <Badge variant="danger" size="sm" className="text-[9px] md:text-xs px-1.5 md:px-2 py-0.5">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className="absolute right-1.5 md:right-3 top-1.5 md:top-3 z-10 
            inline-flex h-6 w-6 md:h-9 md:w-9 
            items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm transition hover:text-secondary-600"
        >
          <Heart
            className="h-3 w-3 md:h-5 md:w-5"
            fill={inWishlist ? 'currentColor' : 'none'}
            strokeWidth={2}
          />
        </button>

        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-50">
          <Image
            src={product.images[0]?.src || '/images/placeholder.jpg'}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 220px"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Product Info - Responsive padding */}
      <div className="p-2 md:p-4 space-y-1 md:space-y-2">
        {/* Title - Compact on mobile, normal on desktop */}
        <h3 className="line-clamp-2 
          text-xs md:text-sm 
          font-semibold text-gray-900 leading-tight 
          min-h-[32px] md:min-h-[40px]">
          {product.name}
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
