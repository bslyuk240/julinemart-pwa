'use client';

import { useState, useEffect } from 'react';
import { Shield, RotateCcw, Truck } from 'lucide-react';
import { getReturnPolicyDays, getFreeShippingThreshold } from '@/lib/woocommerce/policies';

interface ProductFeaturesProps {
  className?: string;
}

export default function ProductFeatures({ className = '' }: ProductFeaturesProps) {
  const [returnDays, setReturnDays] = useState(3); // Default
  const [freeShippingMin, setFreeShippingMin] = useState(10000); // Default
  const [loading, setLoading] = useState(true);
  const [bannerThreshold, setBannerThreshold] = useState<number | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const [days, threshold] = await Promise.all([
          getReturnPolicyDays(),
          getFreeShippingThreshold(),
        ]);

        // Override returns to 3 days as requested
        setReturnDays(3);

        setFreeShippingMin(threshold);

        // Pull banner text to derive free shipping min if present
        const bannerRes = await fetch('/api/pwa-settings');
        if (bannerRes.ok) {
          const data = await bannerRes.json();
          const text: string | undefined = data?.banner?.text;
          if (text) {
            const match = text.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
            if (match) {
              const amt = parseFloat(match[1]);
              if (!isNaN(amt)) {
                setBannerThreshold(amt);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching policies:', error);
        // Keep defaults
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  const formatPrice = (price: number) => `₦${price.toLocaleString()}`;
  const effectiveFreeShipping = bannerThreshold ?? freeShippingMin;

  return (
    <div className={`grid grid-cols-3 gap-3 md:gap-4 ${className}`}>
      <div className="text-center">
        <Truck className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">Free Delivery</p>
        <p className="text-[11px] md:text-xs text-gray-500">
          {loading ? 'Loading...' : `On orders over ${formatPrice(effectiveFreeShipping)}`}
        </p>
      </div>
      
      <div className="text-center">
        <Shield className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">Secure Payment</p>
        <p className="text-[11px] md:text-xs text-gray-500">100% protected</p>
      </div>
      
      <div className="text-center">
        <RotateCcw className="w-5 h-5 md:w-7 md:h-7 text-primary-600 mx-auto mb-1" />
        <p className="text-xs md:text-sm font-medium text-gray-900">Easy Returns</p>
        <p className="text-[11px] md:text-xs text-gray-500">
          {loading ? 'Loading...' : `${returnDays}-day return`}
        </p>
      </div>
    </div>
  );
}
