'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { CartItem as CartItemType } from '@/types/cart';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

export default function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const handleIncrease = () => {
    onUpdateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrease = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.id, item.quantity - 1);
    }
  };

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;

  const itemTotal = item.price * item.quantity;

  return (
    <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm border border-gray-100">
      <div className="flex gap-3 md:gap-4">
        {/* Product Image */}
        <Link href={`/product/${item.slug}`} className="flex-shrink-0">
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={item.image || '/images/placeholder.jpg'}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 80px, 96px"
            />
          </div>
        </Link>

        {/* Product Info - MOBILE OPTIMIZED */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          {/* Top Row: Name + Remove Button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <Link 
              href={`/product/${item.slug}`}
              className="text-sm md:text-base font-medium text-gray-900 hover:text-primary-600 line-clamp-2 flex-1"
            >
              {item.name}
            </Link>
            <button
              onClick={() => onRemove(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
              aria-label="Remove item"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Variation Info (if exists) */}
          {item.variation && Object.keys(item.variation.attributes).length > 0 && (
            <div className="mb-2">
              {Object.entries(item.variation.attributes).map(([key, value]) => (
                <span key={key} className="inline-block text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded mr-1">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}

          {/* Price Row */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-base md:text-lg font-bold text-primary-600">
              {formatPrice(item.price)}
            </span>
            {item.regularPrice && item.regularPrice !== item.price && (
              <span className="text-xs md:text-sm text-gray-500 line-through">
                {formatPrice(item.regularPrice)}
              </span>
            )}
          </div>

          {/* Bottom Row: Quantity Controls + Total */}
          <div className="flex items-center justify-between gap-3">
            {/* Quantity Controls */}
            <div className="flex items-center border border-gray-300 rounded-lg bg-white">
              <button
                onClick={handleDecrease}
                disabled={item.quantity <= 1}
                className="p-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-l-lg"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700" />
              </button>
              <span className="px-3 md:px-4 text-sm md:text-base font-semibold text-gray-900 min-w-[44px] text-center">
                {item.quantity}
              </span>
              <button
                onClick={handleIncrease}
                disabled={item.stockQuantity !== null && item.quantity >= item.stockQuantity}
                className="p-2 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-r-lg"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-700" />
              </button>
            </div>

            {/* Item Total */}
            <div className="text-right">
              <div className="text-xs text-gray-500 md:hidden">Total</div>
              <span className="text-base md:text-lg font-bold text-gray-900">
                {formatPrice(itemTotal)}
              </span>
            </div>
          </div>

          {/* Stock Warning */}
          {item.stockQuantity !== null && item.stockQuantity < 5 && (
            <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
              Only {item.stockQuantity} left in stock
            </div>
          )}
        </div>
      </div>
    </div>
  );
}