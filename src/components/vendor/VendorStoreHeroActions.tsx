'use client';

import { useEffect, useState } from 'react';
import { QrCode, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import FollowStoreButton from '@/components/vendor/FollowStoreButton';

type VendorStoreInlineActionsProps = {
  vendorId: string;
  vendorName: string;
  className?: string;
};

/** Follow + Share cluster for the vendor name row (icon mobile, pill desktop). */
export function VendorStoreInlineActions({
  vendorId,
  vendorName,
  className = '',
}: VendorStoreInlineActionsProps) {
  const storeUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/vendor/${encodeURIComponent(vendorId)}`
      : `/vendor/${vendorId}`;

  const shareStore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: vendorName,
          text: `Shop ${vendorName} on JulineMart`,
          url: storeUrl,
        });
      } else {
        await navigator.clipboard.writeText(storeUrl);
        toast.success('Store link copied');
      }
    } catch {
      /* user cancelled share */
    }
  };

  const shareButtonClass =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white transition active:scale-95 md:h-auto md:w-auto md:gap-1.5 md:rounded-lg md:px-3 md:py-1.5 md:text-sm md:font-semibold md:hover:bg-primary-700';

  return (
    <div className={`flex shrink-0 items-center gap-1.5 ${className}`}>
      <FollowStoreButton
        vendorId={vendorId}
        vendorName={vendorName}
        variant="inline"
      />
      <button
        type="button"
        onClick={shareStore}
        aria-label={`Share ${vendorName}`}
        className={shareButtonClass}
      >
        <Share2 className="h-4 w-4" aria-hidden />
        <span className="hidden md:inline">Share</span>
      </button>
    </div>
  );
}

type VendorStoreQrPanelProps = {
  vendorId: string;
  vendorName: string;
  className?: string;
};

/** Collapsible store QR — sits below the name row, not inline. */
export function VendorStoreQrPanel({
  vendorId,
  vendorName,
  className = '',
}: VendorStoreQrPanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vendor/${encodeURIComponent(vendorId)}/qr`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setQrDataUrl(data?.png_data_url ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [vendorId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('qr') === '1') {
      fetch('/api/vendor/qr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, source: 'store_qr' }),
      }).catch(() => {});
    }
  }, [vendorId]);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setQrOpen((v) => !v)}
        className="inline-flex min-h-[32px] items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-primary-600"
        aria-expanded={qrOpen}
      >
        <QrCode className="h-3.5 w-3.5" aria-hidden />
        {qrOpen ? 'Hide store QR' : 'Show store QR code'}
      </button>

      {qrOpen && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt={`QR code for ${vendorName}`} className="h-14 w-14" />
            ) : (
              <QrCode className="h-6 w-6 text-gray-300" />
            )}
          </div>
          <p className="text-xs leading-relaxed text-gray-600">
            Scan in-store or save this QR so customers can open {vendorName} on JulineMart.
          </p>
        </div>
      )}
    </div>
  );
}
