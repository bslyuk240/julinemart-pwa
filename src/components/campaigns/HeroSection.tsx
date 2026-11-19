'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Play, BadgeCheck } from 'lucide-react';
import type { Campaign } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import CampaignVideoPlayer from '@/components/campaigns/CampaignVideoPlayer';
import CampaignLightbox from '@/components/campaigns/CampaignLightbox';

// Dark, image-led hero. Campaign artwork often carries its own text ("CODE:
// BLACKFRIDAY20"), so the image is shown at its natural aspect ratio and is
// never cropped. On phones the artwork comes first; on desktop it sits to the
// right of the copy.
export default function HeroSection({
  campaign,
  qrVariants = [],
}: {
  campaign: Campaign;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaign.id, qrVariants);
  const [videoOpen, setVideoOpen] = useState(false);
  const hero = campaign.heroConfig;
  const vendorName = campaign.vendorOverride?.name?.trim();
  const desktopImage = hero.heroImageDesktop || hero.heroImageMobile;
  const mobileImage = hero.heroImageMobile || hero.heroImageDesktop;
  const videoUrl = hero.introductoryVideoUrl ?? hero.secondaryCtaVideoUrl;

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] bg-primary-950 text-white">
      {/* Soft brand glow behind the copy. Decorative only. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_0%_0%,rgba(176,51,200,0.45),transparent_60%),radial-gradient(50%_60%_at_100%_100%,rgba(255,122,41,0.22),transparent_60%)]"
      />

      <div
        className={`grid items-center gap-6 p-4 sm:p-8 md:gap-10 md:p-12 ${
          desktopImage ? 'md:grid-cols-[1.05fr_1fr]' : 'md:max-w-3xl'
        }`}
      >
        {desktopImage && (
          <div className="relative md:order-2">
            <picture>
              {mobileImage && mobileImage !== desktopImage && (
                <source media="(max-width: 767px)" srcSet={mobileImage} />
              )}
              <img
                src={desktopImage}
                // The headline sits right beside it, so the art is decorative to screen readers.
                alt=""
                fetchPriority="high"
                decoding="async"
                // Never cropped. Phones cap tall story-format art so the button
                // stays on the first screen; desktop caps it too, in case only
                // phone art was uploaded.
                className="mx-auto block h-auto max-h-[36svh] w-auto max-w-full rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/10 md:max-h-[520px]"
              />
            </picture>
            {vendorName && (
              <div className="absolute -bottom-3 left-4 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-gray-900 shadow-lg">
                {campaign.vendorOverride?.logoUrl ? (
                  <span className="relative h-6 w-6 flex-none overflow-hidden rounded-full bg-gray-100">
                    <Image src={campaign.vendorOverride.logoUrl} alt="" fill className="object-cover" sizes="24px" />
                  </span>
                ) : (
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
                    {vendorName.slice(0, 2).toUpperCase()}
                  </span>
                )}
                <span className="text-xs font-semibold">
                  {vendorName}
                  {campaign.vendorOverride?.location && (
                    <span className="ml-1 font-normal text-gray-500">· {campaign.vendorOverride.location}</span>
                  )}
                </span>
                <BadgeCheck className="h-3.5 w-3.5 text-green-600" aria-label="Verified vendor" />
              </div>
            )}
          </div>
        )}

        <div className="px-2 pb-2 pt-1 sm:px-0 md:order-1 md:py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-4">
            {hero.badgeText && (
              <span className="rounded-full bg-secondary-500 px-3 py-1 text-xs font-bold tracking-wide text-gray-950">
                {hero.badgeText}
              </span>
            )}
            <span className="text-xs font-medium text-primary-200">
              {vendorName ? `${vendorName} on JulineMart` : 'JulineMart'}
            </span>
          </div>

          <h1 className="mb-2 text-balance md:mb-4 text-[2rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            {hero.headline}
          </h1>
          {hero.subtitle && (
            <p className="mb-5 max-w-lg text-pretty text-[15px] leading-relaxed text-white/75 max-md:line-clamp-3 sm:text-base md:mb-7">
              {hero.subtitle}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={hero.ctaActionUrl ?? '#campaign-products'}
              onClick={() => track('cta_click', { cta: 'primary' })}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-secondary-500 px-7 text-[15px] font-bold text-gray-950 shadow-lg shadow-secondary-500/25 transition hover:bg-secondary-400"
            >
              {hero.ctaLabel || 'Shop now'} <ArrowRight className="h-4 w-4" />
            </a>
            {videoUrl && (
              <button
                type="button"
                onClick={() => {
                  setVideoOpen(true);
                  track('video_view');
                }}
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                <Play className="h-3.5 w-3.5" />
                {hero.secondaryCtaLabel ?? 'Watch intro'}
              </button>
            )}
          </div>
        </div>
      </div>

      {videoOpen && videoUrl && (
        <CampaignLightbox label="Campaign video" onClose={() => setVideoOpen(false)}>
          <div className="aspect-video w-full max-w-xl overflow-hidden rounded-xl bg-black">
            <CampaignVideoPlayer url={videoUrl} className="h-full w-full" />
          </div>
        </CampaignLightbox>
      )}
    </section>
  );
}
