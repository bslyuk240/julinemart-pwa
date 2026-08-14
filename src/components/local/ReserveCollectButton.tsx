'use client';

import { useRouter } from 'next/navigation';
import { BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { setCheckoutFulfillmentPref } from '@/lib/local/geolocation';
import { toast } from 'sonner';

type ReserveCollectButtonProps = {
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
};

export default function ReserveCollectButton({
  disabled = false,
  className = '',
  fullWidth = false,
}: ReserveCollectButtonProps) {
  const router = useRouter();
  const { items } = useCart();

  const handleClick = () => {
    if (!items.length) {
      toast.error('Add this product to your cart first');
      return;
    }
    setCheckoutFulfillmentPref('reservation');
    router.push('/checkout');
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="md"
      fullWidth={fullWidth}
      disabled={disabled}
      onClick={handleClick}
      className={`min-h-[44px] gap-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50 ${className}`}
    >
      <BookmarkPlus className="h-4 w-4" />
      Reserve & collect
    </Button>
  );
}
