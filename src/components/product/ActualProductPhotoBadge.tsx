'use client';

import { Camera } from 'lucide-react';

type ActualProductPhotoBadgeProps = {
  className?: string;
  compact?: boolean;
};

export default function ActualProductPhotoBadge({
  className = '',
  compact = false,
}: ActualProductPhotoBadgeProps) {
  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ${className}`}
      >
        <Camera className="h-3 w-3" aria-hidden />
        Seller photo
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 ${className}`}
    >
      <Camera className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
      <span>Seller&apos;s actual product photo</span>
    </div>
  );
}
