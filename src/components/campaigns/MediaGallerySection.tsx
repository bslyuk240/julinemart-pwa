'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { CampaignMediaItem } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';
import { resolveYoutubeThumbnail } from '@/lib/campaigns/video-playback';

function videoThumbnail(item: CampaignMediaItem): string | null {
  return item.thumbnailUrl || resolveYoutubeThumbnail(item.url);
}

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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items?.length) return null;

  const openItem = openIndex != null ? items[openIndex] : null;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-primary-600">From our customers</p>
      <h2 className="mb-5 text-xl font-extrabold text-gray-900">Behind the scenes &amp; customer stories</h2>

      {/* Tiles are fixed at aspect-video (YouTube's own 16:9) regardless of the
          source media's real dimensions — cropped to fill via object-cover.
          Clicking opens the uncropped item at its natural aspect ratio instead
          of playing/zooming inside this same cropped box. */}
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {items.map((item, i) => {
          const thumbnail = item.type === 'video' ? videoThumbnail(item) : null;
          return (
            <div key={i} className="w-[80vw] flex-none overflow-hidden rounded-2xl bg-gray-50 sm:w-80">
              <button
                type="button"
                onClick={() => {
                  setOpenIndex(i);
                  if (item.type === 'video') track('video_view', { mediaIndex: i });
                }}
                className="relative block aspect-video w-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-800"
                aria-label={item.type === 'video' ? 'Play video' : 'View image'}
              >
                {item.type === 'video' ? (
                  <>
                    {thumbnail && (
                      <Image
                        src={thumbnail}
                        alt={item.caption || 'Video thumbnail'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 80vw, 320px"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <span className="rounded-full bg-secondary-500 p-3.5 text-white">
                        <Play className="h-5 w-5" />
                      </span>
                    </span>
                  </>
                ) : (
                  <Image
                    src={item.url}
                    alt={item.caption || 'Campaign media'}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 80vw, 320px"
                  />
                )}
              </button>
              {item.caption && <p className="p-3 text-xs text-gray-600">{item.caption}</p>}
            </div>
          );
        })}
      </div>

      {openItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpenIndex(null)}
        >
          {openItem.type === 'video' ? (
            <div
              className="aspect-video w-full max-w-xl overflow-hidden rounded-xl bg-black"
              onClick={(e) => e.stopPropagation()}
            >
              <CampaignVideoPlayer url={openItem.url} className="h-full w-full" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={openItem.url}
              alt={openItem.caption || 'Campaign media'}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          )}
        </div>
      )}
    </section>
  );
}
