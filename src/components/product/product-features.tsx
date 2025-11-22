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

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const [days, threshold] = await Promise.all([
          getReturnPolicyDays(),
          getFreeShippingThreshold(),
        ]);
        
        setReturnDays(days);
        setFreeShippingMin(threshold);
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

  return (
    <div className={`grid grid-cols-3 gap-4 ${className}`}>
      <div className="text-center">
        <Truck className="w-8 h-8 text-primary-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">Free Delivery</p>
        <p className="text-xs text-gray-500">
          {loading ? 'Loading...' : `On orders over ${formatPrice(freeShippingMin)}`}
        </p>
      </div>
      
      <div className="text-center">
        <Shield className="w-8 h-8 text-primary-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">Secure Payment</p>
        <p className="text-xs text-gray-500">100% protected</p>
      </div>
      
      <div className="text-center">
        <RotateCcw className="w-8 h-8 text-primary-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-900">Easy Returns</p>
        <p className="text-xs text-gray-500">
          {loading ? 'Loading...' : `${returnDays}-day return`}
        </p>
      </div>
    </div>
  );
}