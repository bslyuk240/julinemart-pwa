'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { CampaignMediaItem } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';

export default function MediaGallerySection({
  campaignId,
  items,
  qrVariants = [],
}: {
  campaignId: string;
  items?: CampaignMediaItem[];
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  if (!items?.length) return null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary-600">From our customers</p>
      <h2 className="mb-5 text-xl font-extrabold text-gray-900">Behind the scenes &amp; customer stories</h2>

      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {items.map((item, i) => (
          <div key={i} className="w-[70vw] flex-none overflow-hidden rounded-2xl bg-gray-50 sm:w-64">
            <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary-500 to-primary-800">
              {item.type === 'video' ? (
                playingIndex === i ? (
                  <CampaignVideoPlayer
                    url={item.url}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setPlayingIndex(i);
                      track('video_view', { mediaIndex: i });
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Play video"
                  >
                    <span className="rounded-full bg-secondary-500 p-3.5 text-white">
                      <Play className="h-5 w-5" />
                    </span>
                  </button>
                )
              ) : (
                <Image
                  src={item.url}
                  alt={item.caption || 'Campaign media'}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 70vw, 256px"
                />
              )}
            </div>
            {item.caption && <p className="p-3 text-xs text-gray-600">{item.caption}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
