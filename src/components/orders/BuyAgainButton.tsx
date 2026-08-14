'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart-store';
import { reorderLinesToCart, type ReorderLineItem } from '@/lib/reorder/reorder-from-order';
import { toast } from 'sonner';

type BuyAgainButtonProps = {
  lineItems: ReorderLineItem[];
  label?: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
};

export default function BuyAgainButton({
  lineItems,
  label = 'Buy again',
  size = 'sm',
  fullWidth = false,
}: BuyAgainButtonProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [loading, setLoading] = useState(false);

  if (!lineItems?.length) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      const { added, skipped } = await reorderLinesToCart(lineItems, addItem);
      if (added === 0) {
        toast.error('Items from this order are no longer available');
        return;
      }
      if (skipped.length) {
        toast.message(`${added} item(s) added. ${skipped.length} unavailable.`);
      } else {
        toast.success(`${added} item(s) added to cart`);
      }
      router.push('/cart');
    } catch {
      toast.error('Could not reorder items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      fullWidth={fullWidth}
      isLoading={loading}
      onClick={handleClick}
      className="min-h-[44px] gap-2"
    >
      <RotateCcw className="h-4 w-4" />
      {label}
    </Button>
  );
}
