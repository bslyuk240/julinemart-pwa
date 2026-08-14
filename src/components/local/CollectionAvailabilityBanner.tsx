'use client';

import { MapPin, Clock } from 'lucide-react';
import type { VendorTrustResponse } from '@/lib/trust/get-vendor-trust';

type CollectionAvailabilityBannerProps = {
  trust: VendorTrustResponse | null;
  distanceKm?: number | null;
  className?: string;
};

export default function CollectionAvailabilityBanner({
  trust,
  distanceKm,
  className = '',
}: CollectionAvailabilityBannerProps) {
  const store = trust?.physical_store;
  if (!store?.supports_pickup) return null;

  const locationLabel = [store.area, store.city].filter(Boolean).join(', ') || store.city || 'near you';

  return (
    <div
      className={`rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 ${className}`}
    >
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden />
        <div className="min-w-0 text-sm text-emerald-900">
          <p className="font-semibold">
            Also available for collection in {locationLabel}
            {distanceKm != null ? ` · ${distanceKm} km away` : ''}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-emerald-800">
            <Clock className="h-3 w-3" />
            Reserve & collect — hold for 48 hours at the seller&apos;s store
          </p>
        </div>
      </div>
    </div>
  );
}
