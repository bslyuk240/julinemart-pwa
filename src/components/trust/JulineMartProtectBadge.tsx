'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

type JulineMartProtectBadgeProps = {
  variant?: 'default' | 'compact' | 'inline';
  className?: string;
};

export default function JulineMartProtectBadge({
  variant = 'default',
  className = '',
}: JulineMartProtectBadgeProps) {
  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-700 ${className}`}
      >
        <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        Protected by JulineMart Protect
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-50/30 px-3.5 py-3 ring-1 ring-emerald-100 ${className}`}
      >
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600/10">
          <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-emerald-900">JulineMart Protect</p>
          <p className="mt-0.5 text-[11px] leading-snug text-emerald-700">
            Covered against non-delivery and significant order issues
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 md:px-4 md:py-3 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">
            This purchase is protected by JulineMart Protect
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-emerald-800">
            Coverage against non-delivery, wrong or damaged items, and seller non-fulfilment on
            eligible orders.
          </p>
          <Link
            href="/page/terms-of-service"
            className="mt-1 inline-block text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
          >
            View protection details
          </Link>
        </div>
      </div>
    </div>
  );
}
