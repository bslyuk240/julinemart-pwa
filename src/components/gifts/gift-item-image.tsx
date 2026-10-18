'use client';

import { useState } from 'react';
import { Gift } from 'lucide-react';

/**
 * Gift item thumbnail that falls back to a placeholder when the URL is empty
 * or fails to load (e.g. legacy product images on a host that no longer resolves).
 */
export default function GiftItemImage({ src, className = '' }: { src?: string | null; className?: string }) {
  // Remember which URL failed, so a new src gets a fresh attempt.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 ${className}`}>
        <Gift className="h-8 w-8 text-gray-300" aria-hidden />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // An image can fail before React attaches onError; catch that case on mount too.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailedSrc(src);
      }}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(src)}
      className={`object-cover ${className}`}
    />
  );
}
