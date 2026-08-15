'use client';

import { useMemo, useState } from 'react';
import { Gift } from 'lucide-react';

type Props = {
  name: string;
  coverUrl: string | null;
  galleryUrls?: string[];
};

export default function GiftBoxGallery({ name, coverUrl, galleryUrls = [] }: Props) {
  const images = useMemo(() => {
    const all = [coverUrl, ...galleryUrls].filter((u): u is string => Boolean(u));
    return [...new Set(all)];
  }, [coverUrl, galleryUrls]);

  const [active, setActive] = useState(0);
  const current = images[active] || null;

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 lg:aspect-square">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gift className="h-20 w-20 text-gray-300" />
          </div>
        )}
      </div>
      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto border-t border-gray-100 p-3 scrollbar-none">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(i)}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? 'border-primary-600' : 'border-transparent ring-1 ring-gray-200'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
