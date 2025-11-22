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
    <div className="flex gap-3 md:gap-4 py-3 md:py-4 border-b border-gray-200 last:border-b-0">
      {/* Product Image */}
      <Link href={`/product/${item.slug}`} className="flex-shrink-0">
        <div className="relative w-18 h-18 md:w-24 md:h-24 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={item.image || '/images/placeholder.jpg'}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>
      </Link>

      {/* Product Details */}
      <div className="flex-1 min-w-0">
        <Link 
          href={`/product/${item.slug}`}
          className="block font-medium text-gray-900 hover:text-primary-600 transition-colors mb-1 line-clamp-2 text-sm md:text-base"
        >
          {item.name}
        </Link>

        {/* Variation Details */}
        {item.variation?.attributes && Object.keys(item.variation.attributes).length > 0 && (
          <div className="text-xs text-gray-500 mb-1">
            {Object.entries(item.variation.attributes).map(([key, value]) => (
              <span key={key} className="mr-2">
                {key}: <span className="font-medium">{value}</span>
              </span>
            ))}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-base md:text-lg font-bold text-primary-600">
            {formatPrice(item.price)}
          </span>
          {item.regularPrice && item.regularPrice > item.price && (
            <span className="text-xs md:text-sm text-gray-400 line-through">
              {formatPrice(item.regularPrice)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        {item.stockStatus === 'outofstock' && (
          <p className="text-xs text-red-600 font-medium mb-2">Out of Stock</p>
        )}
        {item.stockStatus === 'onbackorder' && (
          <p className="text-xs text-yellow-600 font-medium mb-2">On Backorder</p>
        )}

        {/* Quantity Controls & Remove Button */}
        <div className="flex items-center gap-2 mt-3">
          {/* Quantity Control */}
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={handleDecrease}
              disabled={item.quantity <= 1}
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>

            <span className="px-3 py-1.5 font-medium text-gray-900 min-w-[34px] text-center text-sm">
              {item.quantity}
            </span>

            <button
              onClick={handleIncrease}
              disabled={
                item.stockStatus === 'outofstock' ||
                (item.stockQuantity !== null && item.quantity >= item.stockQuantity)
              }
              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(item.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Remove item"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* Item Total (Desktop) */}
          <div className="ml-auto hidden md:block">
            <p className="text-base md:text-lg font-bold text-primary-900">
              {formatPrice(itemTotal)}
            </p>
          </div>
        </div>

        {/* Item Total (Mobile) */}
        <div className="md:hidden mt-2">
          <p className="text-sm font-bold text-primary-900">
            Subtotal: {formatPrice(itemTotal)}
          </p>
        </div>
      </div>
    </div>
  );
}
