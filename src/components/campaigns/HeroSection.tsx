'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Play, BadgeCheck } from 'lucide-react';
import type { Campaign } from '@/types/campaigns';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';

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
  const vendorName = campaign.vendorOverride?.name;

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary-50 p-6 sm:p-10">
      <div className="grid items-center gap-7 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-extrabold uppercase tracking-wide text-primary-600">
            {vendorName ? `${vendorName} · JulineMart Marketplace` : 'JulineMart Marketplace'}
          </p>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl">
            {hero.headline}
          </h1>
          <p className="mb-6 max-w-md text-sm text-gray-600 sm:text-base">{hero.subtitle}</p>

          {hero.badgeText && (
            <span className="mb-6 inline-flex items-center rounded-full border border-primary-200 bg-white px-3.5 py-1.5 text-xs font-bold text-primary-700">
              {hero.badgeText}
            </span>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={hero.ctaActionUrl ?? '#campaign-products'}
              onClick={() => track('cta_click', { cta: 'primary' })}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-secondary-500 px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-secondary-500/30 transition hover:bg-secondary-600"
            >
              {hero.ctaLabel} <ArrowRight className="h-4 w-4" />
            </a>
            {(hero.secondaryCtaVideoUrl || hero.introductoryVideoUrl) && (
              <button
                onClick={() => {
                  setVideoOpen(true);
                  track('video_view');
                }}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-primary-600 bg-white px-6 py-3 text-sm font-extrabold text-primary-700"
              >
                <Play className="h-3.5 w-3.5" />
                {hero.secondaryCtaLabel ?? 'Watch Intro'}
              </button>
            )}
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 shadow-xl shadow-primary-600/20">
            {hero.heroImageDesktop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hero.heroImageDesktop}
                alt={hero.headline}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {vendorName && (
            <div className="absolute -bottom-3 left-6 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 shadow-lg">
              {campaign.vendorOverride?.logoUrl ? (
                <span className="relative h-6 w-6 flex-none overflow-hidden rounded-full bg-primary-50">
                  <Image
                    src={campaign.vendorOverride.logoUrl}
                    alt={vendorName}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </span>
              ) : (
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary-600 text-[10px] font-extrabold text-white">
                  {vendorName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="text-xs font-bold text-gray-900">
                {vendorName}
                {campaign.vendorOverride?.location && (
                  <em className="ml-1 font-normal not-italic text-gray-500">
                    · {campaign.vendorOverride.location}
                  </em>
                )}
              </span>
              <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
            </div>
          )}
        </div>
      </div>

      {videoOpen && (hero.introductoryVideoUrl || hero.secondaryCtaVideoUrl) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setVideoOpen(false)}
        >
          <video
            src={hero.introductoryVideoUrl ?? hero.secondaryCtaVideoUrl}
            controls
            autoPlay
            className="max-h-[80vh] w-full max-w-xl rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
