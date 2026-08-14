'use client';

import { Shield } from 'lucide-react';
import { formatWarrantySummary } from '@/lib/warranty';
import type { WarrantyType } from '@/lib/warranty';

type ProductWarrantyBadgeProps = {
  warrantyType?: WarrantyType | string | null;
  warrantyMonths?: number | null;
  className?: string;
};

export default function ProductWarrantyBadge({
  warrantyType,
  warrantyMonths,
  className = '',
}: ProductWarrantyBadgeProps) {
  const summary = formatWarrantySummary(warrantyType, warrantyMonths);
  if (!summary) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-800 ${className}`}
    >
      <Shield className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{summary}</span>
    </div>
  );
}
