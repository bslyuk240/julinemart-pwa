'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import CarouselDots from '@/components/home/carousel-dots';
import { useAutoAdvance } from '@/hooks/use-auto-advance';
import { isNativeApp } from '@/lib/mobile/platform';
import type { HeroAd } from '@/lib/home/pwa-settings';

const noSubscribe = () => () => {};

const isAppStoreAd = (ad: HeroAd) => /play\.google\.com|apps\.apple\.com/i.test(ad.link);

/** Ads carry no alt text yet, so name them by where they go. */
function adLabel(ad: HeroAd, i: number, count: number) {
  const external = /^https?:\/\//i.test(ad.link);
  const name = isAppStoreAd(ad)
    ? 'Get the JulineMart app'
    : /vendor/i.test(ad.link)
      ? 'Sell on JulineMart'
      : `Ad ${i + 1} of ${count}`;
  return external ? `${name} (opens in a new tab)` : name;
}

/**
 * Phone homepage (md:hidden): every ad from the desktop side panels in one small
 * row, each shown whole at its own tall shape, about three and a half at a time.
 * Slides on its own, offset from the hero. Inside the Android app the "get the
 * app" ads are dropped, since the shopper already has it.
 */
export default function HomeAdCarousel({ ads }: { ads: HeroAd[] }) {
  // False on the server and in browsers; true inside the Capacitor app.
  const inApp = useSyncExternalStore(noSubscribe, isNativeApp, () => false);

  const visible = useMemo(() => (inApp ? ads.filter((ad) => !isAppStoreAd(ad)) : ads), [ads, inApp]);
  const trackRef = useRef<HTMLDivElement>(null);
  const { index, select, scrollable } = useAutoAdvance(trackRef, { count: visible.length, intervalMs: 6500, delayMs: 3000 });

  // Video ads start only when the row is actually shown (it is hidden on desktop).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || track.offsetParent === null) return;
    track.querySelectorAll('video').forEach((video) => video.play().catch(() => {}));
  }, [visible]);

  if (visible.length === 0) return null;

  return (
    <section className="pt-6 md:hidden" aria-label="From JulineMart" aria-roledescription="carousel">
      <div
        ref={trackRef}
        className={`relative flex snap-x snap-mandatory scroll-px-4 gap-2.5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${scrollable ? '' : 'justify-center'}`}
      >
        {visible.map((ad, i) => {
          const external = /^https?:\/\//i.test(ad.link);
          return (
            <a
              key={`${ad.image_url}-${i}`}
              href={ad.link || '/'}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              aria-label={adLabel(ad, i, visible.length)}
              className="relative block aspect-[880/1484] w-[28%] flex-none snap-start overflow-hidden rounded-[10px] bg-m-surface-container shadow-[0_1px_2px_rgb(30_26_31/0.1)]"
            >
              {ad.type === 'video' && ad.video_url ? (
                <video
                  src={ad.video_url}
                  poster={ad.image_url || undefined}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : (
                <Image src={ad.image_url} alt="" fill className="object-cover" sizes="30vw" quality={85} />
              )}
            </a>
          );
        })}
      </div>
      {scrollable && <CarouselDots count={visible.length} index={index} onSelect={select} label="Ad" className="pt-1" />}
    </section>
  );
}
