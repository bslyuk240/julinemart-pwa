'use client';

import { BadgeCheck, MapPin, ShieldCheck, Store } from 'lucide-react';
import type { VerificationType } from '@/types/trust';
import { verificationLabel } from '@/lib/trust/get-vendor-trust';
import { VERIFICATION_LEVEL_LABELS, type VerificationLevel } from '@/types/trust';

type SellerTrustBadgeProps = {
  level: VerificationLevel;
  verifications?: VerificationType[];
  compact?: boolean;
  className?: string;
};

export default function SellerTrustBadge({
  level,
  verifications = [],
  compact = false,
  className = '',
}: SellerTrustBadgeProps) {
  if (level <= 0 && verifications.length === 0) return null;

  const levelLabel = level > 0 ? VERIFICATION_LEVEL_LABELS[level as VerificationLevel] : null;

  if (compact) {
    return (
      <div className={`flex flex-wrap gap-1.5 ${className}`}>
        {levelLabel && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
            <BadgeCheck className="h-3 w-3" aria-hidden />
            {levelLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {levelLabel && (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {levelLabel}
        </div>
      )}
      {verifications.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {verifications.slice(0, 4).map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700"
            >
              <BadgeCheck className="h-3 w-3 text-emerald-600" aria-hidden />
              {verificationLabel(type)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

type SellerTrustPanelProps = {
  level: VerificationLevel;
  verifications?: VerificationType[];
  successfulOrders?: number;
  fulfilmentRate?: number | null;
  physicalStore?: {
    area?: string | null;
    city?: string | null;
    state?: string | null;
    supports_pickup?: boolean;
  } | null;
};

export function SellerTrustPanel({
  level,
  verifications = [],
  successfulOrders = 0,
  fulfilmentRate,
  physicalStore,
}: SellerTrustPanelProps) {
  const hasTrust = level > 0 || verifications.length > 0 || successfulOrders > 0;

  if (!hasTrust && !physicalStore) return null;

  return (
    <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden />
        <h2 className="text-sm font-semibold text-gray-900">Trusted seller</h2>
      </div>

      <SellerTrustBadge level={level} verifications={verifications} />

      {(successfulOrders > 0 || fulfilmentRate != null) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {successfulOrders > 0 && (
            <div className="rounded-xl bg-white/80 px-3 py-2 text-center border border-gray-100">
              <p className="text-base font-bold text-gray-900">{successfulOrders.toLocaleString()}</p>
              <p className="text-[11px] text-gray-500">Successful orders</p>
            </div>
          )}
          {fulfilmentRate != null && (
            <div className="rounded-xl bg-white/80 px-3 py-2 text-center border border-gray-100">
              <p className="text-base font-bold text-gray-900">{Math.round(fulfilmentRate)}%</p>
              <p className="text-[11px] text-gray-500">Fulfilment rate</p>
            </div>
          )}
        </div>
      )}

      {physicalStore && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/80 border border-gray-100 px-3 py-2.5">
          <Store className="mt-0.5 h-4 w-4 text-primary-600 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900">Physical store verified</p>
            <p className="text-[11px] text-gray-600 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              {[physicalStore.area, physicalStore.city, physicalStore.state].filter(Boolean).join(', ')}
            </p>
            {physicalStore.supports_pickup && (
              <p className="text-[11px] text-emerald-700 font-medium mt-1">Collection available</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
