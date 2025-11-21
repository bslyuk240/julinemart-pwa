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
}

export default function ProductCard({ product, showBadge = false }: ProductCardProps) {
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

  return (
    <Link
      href={`/product/${product.slug}`}
      className="product-card block overflow-hidden rounded-xl bg-white shadow-card transition-all duration-200 hover:shadow-card-hover"
    >
      <div className="relative">
        {showBadge && (
          <div className="absolute left-3 top-3 z-10">
            <Badge variant="secondary" size="sm">
              Featured
            </Badge>
          </div>
        )}

        <button
          type="button"
          onClick={handleToggleWishlist}
          className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow transition hover:text-secondary-600"
        >
          <Heart
            className="h-5 w-5"
            fill={inWishlist ? 'currentColor' : 'none'}
            strokeWidth={1.75}
          />
        </button>

        <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
          <Image
            src={product.images[0]?.src || '/images/placeholder.jpg'}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 50vw"
            className="object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </div>
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{product.name}</h3>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-primary-700">{formatCurrency(price)}</span>
          {regularPrice > price && (
            <span className="text-sm text-gray-400 line-through">{formatCurrency(regularPrice)}</span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
            <span>{rating.toFixed(1)}</span>
            <span>({product.rating_count ?? 0})</span>
          </span>
          <span className={`font-medium ${outOfStock ? 'text-red-500' : 'text-green-600'}`}>
            {outOfStock ? 'Out of stock' : 'In stock'}
          </span>
        </div>

        <button
          type="button"
          disabled={outOfStock || isAddingToCart}
          onClick={handleAddToCart}
          className="btn btn-primary flex w-full items-center justify-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {outOfStock ? 'Unavailable' : isAddingToCart ? 'Adding...' : 'Add to cart'}
        </button>
      </div>
    </Link>
  );
}
