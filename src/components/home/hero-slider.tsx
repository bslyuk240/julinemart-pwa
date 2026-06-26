'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, ImageIcon } from 'lucide-react';

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

type HeroAd = {
  type?: 'image' | 'video';
  image_url: string;
  video_url?: string;
  link: string;
};

type HeroAds = {
  left?: HeroAd;
  right?: HeroAd;
};

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    type: 'video',
    videoSrc: 'https://res.cloudinary.com/dupgdbwrt/video/upload/v1763955248/copy_E58DF95E-E76A-4B31-B3D0-9D89B0E8F2C0_otgkkq.mp4',
    videoPoster: '/images/placeholder.svg',
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

function AdPanel({ ad, side }: { ad?: HeroAd; side: 'left' | 'right' }) {
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
      className="block w-full h-full rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow"
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
            alt={`${side} ad banner`}
            fill
            className="object-cover"
            sizes="20vw"
          />
        )}
      </div>
    </a>
  );
}

export default function HeroSlider() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
  const [heroAds, setHeroAds] = useState<HeroAds>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const activeSlides = slides ?? [];
  const slide = activeSlides[currentSlide] || activeSlides[0];

  useEffect(() => {
    let cancelled = false;

    async function fetchSlides() {
      try {
        const response = await fetch('/api/pwa-settings');
        if (!response.ok) {
          if (!cancelled) setSlides(DEFAULT_SLIDES);
          return;
        }

        const data = await response.json();

        // Hero ads
        if (data?.hero_ads && !cancelled) setHeroAds(data.hero_ads);

        // Slides
        const sourceSlides = Array.isArray(data?.sliders) ? data.sliders : [];
        if (sourceSlides.length === 0) {
          if (!cancelled) setSlides(DEFAULT_SLIDES);
          return;
        }

        const transformedSlides: Slide[] = sourceSlides.map((wpSlide: any, index: number) => ({
          id: index + 1,
          type: wpSlide.type || 'image',
          backgroundImage: wpSlide.type === 'image' ? wpSlide.media_url : undefined,
          videoSrc: wpSlide.type === 'video' ? wpSlide.media_url : undefined,
          videoPoster: wpSlide.type === 'video' ? '/images/placeholder.svg' : undefined,
          title: wpSlide.title,
          description: wpSlide.description,
          primaryButton: {
            text: wpSlide.button_text || 'Shop Now',
            link: wpSlide.button_link || '/products',
          },
          secondaryButton: {
            text: wpSlide.button_text_2 || 'View deals',
            link: wpSlide.button_link_2 || '/products?tag=deal',
          },
          useGradient: wpSlide.type === 'gradient',
          gradientColors: 'from-primary-600 via-primary-500 to-secondary-400',
          overlayOpacity: wpSlide.overlay_opacity || 0.3,
        }));

        if (!cancelled) setSlides(transformedSlides);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error fetching hero slides:', error);
        if (!cancelled) setSlides(DEFAULT_SLIDES);
      } finally {
        if (!cancelled) setHasLoaded(true);
      }
    }

    fetchSlides();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (slide && currentSlide >= activeSlides.length) setCurrentSlide(0);
  }, [activeSlides.length, currentSlide, slide]);

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

  const skeleton = (
    <div className="absolute inset-0 bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-400">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.14),transparent_18%)]" />
      <div className="absolute inset-0 flex flex-col justify-between p-4">
        <div className="h-7 w-24 rounded-full bg-white/80 animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-full bg-white/20 animate-pulse" />
          <div className="h-3 w-60 rounded-full bg-white/15 animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE: full-width single-slide carousel — 16:9 aspect ratio ── */}
      <div className="md:hidden relative overflow-hidden rounded-xl shadow-lg group">
        <Link href={slide?.primaryButton.link || '/products'} className="block relative w-full aspect-video">
          {!hasLoaded || !slide ? skeleton : (
            <SlideContent
              slide={slide}
              isActive
              isMuted={isMuted}
              onToggleMute={toggleMute}
              videoRef={videoRef}
              onEnded={nextSlide}
            />
          )}
        </Link>

        {activeSlides.length > 1 && hasLoaded && (
          <>
            <button onClick={prevSlide} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20" aria-label="Previous slide">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={nextSlide} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20" aria-label="Next slide">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
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

      {/* ── DESKTOP: left ad | focal slider (60%) | right ad ── */}
      <div className="hidden md:block">
        <div className="flex gap-2 items-stretch">

          {/* Left ad — 20% */}
          <div className="w-[20%] flex-shrink-0">
            <AdPanel ad={heroAds.left} side="left" />
          </div>

          {/* Focal slider — 60% */}
          <div className="w-[60%] flex-shrink-0">
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg group">
              <Link href={slide?.primaryButton.link || '/products'} className="absolute inset-0 z-10" aria-label="View banner offer" />
              {!hasLoaded || !slide ? skeleton : (
                <SlideContent
                  slide={slide}
                  isActive
                  isMuted={isMuted}
                  onToggleMute={toggleMute}
                  videoRef={videoRef}
                  onEnded={nextSlide}
                />
              )}

              {activeSlides.length > 1 && hasLoaded && (
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
            <AdPanel ad={heroAds.right} side="right" />
          </div>

        </div>
      </div>
    </>
  );
}
