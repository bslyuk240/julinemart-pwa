'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, ImageIcon } from 'lucide-react';
import CarouselDots from '@/components/home/carousel-dots';
import { useAutoAdvance } from '@/hooks/use-auto-advance';
import type { HeroAd, HeroAdLists } from '@/lib/home/pwa-settings';

type Slide = {
  id?: number;
  type: 'image' | 'video';
  backgroundImage?: string;
  videoSrc?: string;
  videoPoster?: string;
  title?: string;
  description?: string;
  primaryButton: { text: string; link: string };
  secondaryButton: { text: string; link: string };
  useGradient: boolean;
  gradientColors: string;
  overlayOpacity: number;
};

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    type: 'video',
    videoSrc: 'https://res.cloudinary.com/dupgdbwrt/video/upload/v1763955248/copy_E58DF95E-E76A-4B31-B3D0-9D89B0E8F2C0_otgkkq.mp4',
    videoPoster: '/images/placeholder.png',
    primaryButton: { text: 'Shop Now', link: '/products' },
    secondaryButton: { text: 'View deals', link: '/products?tag=deal' },
    useGradient: false,
    gradientColors: '',
    overlayOpacity: 0.3,
  },
  {
    id: 2,
    type: 'image',
    backgroundImage: '/images/hero-slide-1.jpg',
    primaryButton: { text: 'Start shopping', link: '/products' },
    secondaryButton: { text: 'View deals', link: '/products?tag=deal' },
    useGradient: false,
    gradientColors: '',
    overlayOpacity: 0.2,
  },
  {
    id: 3,
    type: 'image',
    primaryButton: { text: 'Browse Categories', link: '/categories' },
    secondaryButton: { text: 'Hot Deals', link: '/products?tag=deal' },
    useGradient: true,
    gradientColors: 'from-primary-600 via-primary-500 to-secondary-400',
    overlayOpacity: 0,
  },
];

function SlideContent({
  slide,
  isActive,
  isMuted,
  onToggleMute,
  videoRef,
  onEnded,
}: {
  slide: Slide;
  isActive: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  onEnded?: () => void;
}) {
  return (
    <>
      {slide.type === 'video' && slide.videoSrc ? (
        <>
          <video
            ref={isActive ? videoRef : undefined}
            src={slide.videoSrc}
            poster={slide.videoPoster}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay={isActive}
            muted={isMuted}
            loop
            onEnded={isActive ? onEnded : undefined}
            playsInline
            preload="metadata"
          />
          {slide.overlayOpacity > 0 && (
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
              style={{ opacity: slide.overlayOpacity }}
            />
          )}
          {isActive && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleMute(); }}
              className="absolute top-3 right-3 z-30 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full shadow-lg transition-all"
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </>
      ) : slide.backgroundImage ? (
        <>
          <Image
            src={slide.backgroundImage}
            alt={slide.title || 'Hero banner'}
            fill
            className="object-cover"
            priority={isActive}
            quality={90}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
          {slide.overlayOpacity > 0 && (
            <div
              className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
              style={{ opacity: slide.overlayOpacity }}
            />
          )}
        </>
      ) : (
        <div
          className={`absolute inset-0 bg-gradient-to-r ${
            slide.useGradient
              ? slide.gradientColors
              : 'from-primary-600 via-primary-500 to-secondary-400'
          }`}
        />
      )}

    </>
  );
}

function AdPanel({ ad, side, flat = false }: { ad?: HeroAd; side: 'left' | 'right'; flat?: boolean }) {
  if (!ad?.image_url) {
    return (
      <div className="w-full h-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 text-gray-300">
        <ImageIcon className="w-8 h-8" />
        <span className="text-xs font-medium">{side === 'left' ? 'Left' : 'Right'} Ad</span>
      </div>
    );
  }

  const isExternal = ad.link?.startsWith('http');
  const isVideo = ad.type === 'video' && ad.video_url;

  return (
    <a
      href={ad.link || '/'}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={flat ? 'block w-full h-full' : 'block w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow'}
    >
      <div className="relative w-full h-full">
        {isVideo ? (
          <video
            src={ad.video_url}
            poster={ad.image_url || undefined}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <Image
            src={ad.image_url}
            alt={ad.alt || `${side} ad banner`}
            fill
            className="object-cover"
            quality={90}
            sizes="20vw"
          />
        )}
      </div>
    </a>
  );
}

/** Slides as saved in JLO admin (Homepage Content > Hero slider). */
function toSlides(sliders: unknown[] | undefined): Slide[] {
  if (!Array.isArray(sliders) || sliders.length === 0) return DEFAULT_SLIDES;
  return sliders.map((raw, index) => {
    const s = (raw ?? {}) as Record<string, any>;
    return {
      id: index + 1,
      type: s.type || 'image',
      backgroundImage: s.type === 'image' ? s.media_url : undefined,
      videoSrc: s.type === 'video' ? s.media_url : undefined,
      videoPoster: s.type === 'video' ? '/images/placeholder.svg' : undefined,
      title: s.title,
      description: s.description,
      primaryButton: {
        text: s.button_text || 'Shop Now',
        link: s.button_link || '/products',
      },
      secondaryButton: {
        text: s.button_text_2 || 'View deals',
        link: s.button_link_2 || '/products?tag=deal',
      },
      useGradient: s.type === 'gradient',
      gradientColors: 'from-primary-600 via-primary-500 to-secondary-400',
      overlayOpacity: s.overlay_opacity || 0.3,
    };
  });
}

/** A desktop side panel: one ad, or several that slide on their own. */
function SidePanel({ ads, side, delayMs }: { ads: HeroAd[]; side: 'left' | 'right'; delayMs: number }) {
  if (ads.length <= 1) return <AdPanel ad={ads[0]} side={side} />;
  return <SlidingAdPanel ads={ads} side={side} delayMs={delayMs} />;
}

function SlidingAdPanel({ ads, side, delayMs }: { ads: HeroAd[]; side: 'left' | 'right'; delayMs: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { index, select } = useAutoAdvance(trackRef, { count: ads.length, intervalMs: 7000, delayMs });
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl shadow-md transition-shadow hover:shadow-lg"
      aria-roledescription="carousel"
      aria-label={`${side === 'left' ? 'Left' : 'Right'} ads`}
    >
      <div
        ref={trackRef}
        className="relative flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ads.map((ad, i) => (
          <div key={`${ad.image_url}-${i}`} className="h-full w-full flex-none snap-start">
            <AdPanel ad={ad} side={side} flat />
          </div>
        ))}
      </div>
      <CarouselDots count={ads.length} index={index} onSelect={select} label="Ad" onImage className="absolute inset-x-0 bottom-1" />
    </div>
  );
}

/** Phone hero: a swipeable row of banners, whole at 16:9, with dots underneath. */
function PhoneHero({ slides }: { slides: Slide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hasVideo = slides.some((s) => s.type === 'video');
  const { index, select } = useAutoAdvance(trackRef, { count: slides.length, intervalMs: hasVideo ? 8000 : 5000 });
  const [isMuted, setIsMuted] = useState(true);

  // Only the banner in front plays; nothing plays on desktop (hidden) or with reduced motion.
  useEffect(() => {
    if (!trackRef.current || trackRef.current.offsetParent === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    trackRef.current.querySelectorAll<HTMLVideoElement>('video[data-slide]').forEach((video) => {
      if (Number(video.dataset.slide) === index) video.play().catch(() => {});
      else video.pause();
    });
  }, [index]);

  return (
    <div className="md:hidden">
      <div
        ref={trackRef}
        aria-roledescription="carousel"
        aria-label="Featured"
        className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-m-image [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((s, i) => (
          <div
            key={s.id ?? i}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
            className="relative aspect-video w-full flex-none snap-start overflow-hidden rounded-m-image bg-m-surface-container"
          >
            <Link
              href={s.primaryButton.link || '/products'}
              aria-label={s.title || s.primaryButton.text || 'View banner offer'}
              className="absolute inset-0"
            >
              {s.type === 'video' && s.videoSrc ? (
                <video
                  data-slide={i}
                  src={s.videoSrc}
                  poster={s.videoPoster}
                  className="absolute inset-0 h-full w-full object-cover"
                  muted={isMuted}
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : s.backgroundImage ? (
                <Image
                  src={s.backgroundImage}
                  alt={s.title || ''}
                  fill
                  className="object-cover"
                  quality={85}
                  sizes="100vw"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-r ${s.gradientColors}`} />
              )}
            </Link>
            {s.type === 'video' && s.videoSrc && (
              <button
                type="button"
                onClick={() => setIsMuted((muted) => !muted)}
                className="absolute right-1 top-1 z-10 grid h-12 w-12 place-items-center rounded-full"
                aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white">
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </span>
              </button>
            )}
          </div>
        ))}
      </div>
      <CarouselDots count={slides.length} index={index} onSelect={select} label="Banner" className="pt-1" />
    </div>
  );
}

const NO_ADS: HeroAdLists = { left: [], right: [] };

export default function HeroSlider({ sliders, ads = NO_ADS }: { sliders?: unknown[]; ads?: HeroAdLists }) {
  // Slides and ads come from the server (getPwaSettings), so the hero renders with the page.
  const [activeSlides] = useState<Slide[]>(() => toSlides(sliders));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const slide = activeSlides[currentSlide] || activeSlides[0];

  useEffect(() => {
    if (activeSlides.length <= 1 || !slide) return;
    const delay = slide.type === 'video' ? 8000 : 5000;
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [currentSlide, activeSlides.length, slide]);

  useEffect(() => {
    if (slide?.type === 'video' && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [currentSlide, slide?.type]);

  const nextSlide = () => {
    if (activeSlides.length <= 1) return;
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  const prevSlide = () => {
    if (activeSlides.length <= 1) return;
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted) video.play().catch(() => {});
  };

  return (
    <>
      <PhoneHero slides={activeSlides} />

      {/* ── DESKTOP: left ad | focal slider (60%) | right ad ── */}
      <div className="hidden md:block">
        <div className="flex gap-2 items-stretch">

          {/* Left ad — 20% */}
          <div className="w-[20%] flex-shrink-0">
            <SidePanel ads={ads.left} side="left" delayMs={1500} />
          </div>

          {/* Focal slider — 60% */}
          <div className="w-[60%] flex-shrink-0">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg group">
              <Link href={slide?.primaryButton.link || '/products'} className="absolute inset-0 z-10" aria-label="View banner offer" />
              {slide && (
                <SlideContent
                  slide={slide}
                  isActive
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  videoRef={videoRef}
                  onEnded={nextSlide}
                />
              )}

              {activeSlides.length > 1 && (
                <>
                  <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20" aria-label="Previous slide">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20" aria-label="Next slide">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {activeSlides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'}`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right ad — 20% */}
          <div className="w-[20%] flex-shrink-0">
            <SidePanel ads={ads.right} side="right" delayMs={4500} />
          </div>

        </div>
      </div>
    </>
  );
}
