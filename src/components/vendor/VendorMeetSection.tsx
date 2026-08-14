'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play, X } from 'lucide-react';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';

type VendorMeetSectionProps = {
  vendorName: string;
  story?: string | null;
  logoUrl?: string | null;
  introVideoUrl?: string | null;
};

export default function VendorMeetSection({
  vendorName,
  story,
  logoUrl,
  introVideoUrl,
}: VendorMeetSectionProps) {
  const [videoOpen, setVideoOpen] = useState(false);

  if (!story && !introVideoUrl) return null;

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl bg-white p-4 shadow-sm md:p-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary-600">Meet the seller</p>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <div className="flex items-start gap-3 md:flex-1">
            {logoUrl && (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gray-100">
                <Image src={logoUrl} alt="" fill className="object-cover" sizes="56px" />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900">{vendorName}</h2>
              {story && <p className="mt-2 text-sm leading-relaxed text-gray-600">{story}</p>}
            </div>
          </div>

          {introVideoUrl && (
            <div className="shrink-0 md:w-48">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white"
              >
                <Play className="h-4 w-4 fill-current" />
                Watch intro
              </button>
            </div>
          )}
        </div>
      </section>

      {videoOpen && introVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl bg-black">
            <button
              type="button"
              onClick={() => setVideoOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-2 text-white"
              aria-label="Close video"
            >
              <X className="h-5 w-5" />
            </button>
            <CampaignVideoPlayer url={introVideoUrl} className="h-full w-full" />
          </div>
        </div>
      )}
    </>
  );
}
