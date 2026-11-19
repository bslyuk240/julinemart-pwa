'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import type { CampaignMediaItem } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';
import CampaignLightbox from '@/components/campaigns/CampaignLightbox';
import { resolveYoutubeThumbnail } from '@/lib/campaigns/video-playback';

function videoThumbnail(item: CampaignMediaItem): string | null {
  return item.thumbnailUrl || resolveYoutubeThumbnail(item.url);
}

export default function MediaGallerySection({
  campaignId,
  items,
  title,
  qrVariants = [],
}: {
  campaignId: string;
  items?: CampaignMediaItem[];
  /** Section heading from the admin config; neutral default otherwise. */
  title?: string;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!items?.length) return null;

  const openItem = openIndex != null ? items[openIndex] : null;

  return (
    <section aria-labelledby="campaign-gallery-title">
      <h2 id="campaign-gallery-title" className="mb-4 text-2xl font-extrabold tracking-tight text-gray-900">
        {title?.trim() || 'Campaign highlights'}
      </h2>

      {/* Tiles are fixed at aspect-video (YouTube's own 16:9) regardless of the
          source media's real dimensions — cropped to fill via object-cover.
          Clicking opens the uncropped item at its natural aspect ratio instead
          of playing/zooming inside this same cropped box. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:gap-4 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => {
          const thumbnail = item.type === 'video' ? videoThumbnail(item) : null;
          return (
            <div key={i} className="w-[80vw] flex-none snap-start overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 sm:w-80">
              <button
                type="button"
                onClick={() => {
                  setOpenIndex(i);
                  if (item.type === 'video') track('video_view', { mediaIndex: i });
                }}
                className="relative block aspect-video w-full overflow-hidden bg-gray-100"
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
              {item.caption && <p className="px-4 py-3 text-sm text-gray-700">{item.caption}</p>}
            </div>
          );
        })}
      </div>

      {openItem && (
        <CampaignLightbox
          label={openItem.caption || (openItem.type === 'video' ? 'Campaign video' : 'Campaign image')}
          onClose={() => setOpenIndex(null)}
        >
          {openItem.type === 'video' ? (
            <div className="aspect-video w-full max-w-xl overflow-hidden rounded-xl bg-black">
              <CampaignVideoPlayer url={openItem.url} className="h-full w-full" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={openItem.url}
              alt={openItem.caption || 'Campaign media'}
              className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain"
            />
          )}
        </CampaignLightbox>
      )}
    </section>
  );
}
