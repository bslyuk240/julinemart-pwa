'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react';

type Slide = {
  id?: number;
  type: 'image' | 'video';
  backgroundImage?: string;
  videoSrc?: string;
  videoPoster?: string;
  title?: string;
  description?: string;
  primaryButton: {
    text: string;
    link: string;
  };
  secondaryButton: {
    text: string;
    link: string;
  };
  useGradient: boolean;
  gradientColors: string;
  overlayOpacity: number;
};

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    type: 'video',
    videoSrc: 'https://res.cloudinary.com/dupgdbwrt/video/upload/v1763955248/copy_E58DF95E-E76A-4B31-B3D0-9D89B0E8F2C0_otgkkq.mov',
    videoPoster: '/images/placeholder.svg',
    primaryButton: {
      text: 'Shop Now',
      link: '/products',
    },
    secondaryButton: {
      text: 'View deals',
      link: '/products?tag=deal',
    },
    useGradient: false,
    gradientColors: '',
    overlayOpacity: 0.3,
  },
  {
    id: 2,
    type: 'image',
    backgroundImage: '/images/hero-slide-1.jpg',
    primaryButton: {
      text: 'Start shopping',
      link: '/products',
    },
    secondaryButton: {
      text: 'View deals',
      link: '/products?tag=deal',
    },
    useGradient: false,
    gradientColors: '',
    overlayOpacity: 0.2,
  },
  {
    id: 3,
    type: 'image',
    primaryButton: {
      text: 'Browse Categories',
      link: '/categories',
    },
    secondaryButton: {
      text: 'Hot Deals',
      link: '/products?tag=deal',
    },
    useGradient: true,
    gradientColors: 'from-primary-600 via-primary-500 to-secondary-400',
    overlayOpacity: 0,
  },
];

export default function HeroSlider() {
  const [slides, setSlides] = useState<Slide[] | null>(null);
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
        console.log('Fetching hero slides from settings...');
        const response = await fetch('/api/pwa-settings');

        if (!response.ok) {
          if (!cancelled) setSlides(DEFAULT_SLIDES);
          return;
        }

        const data = await response.json();
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

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slide && currentSlide >= activeSlides.length) {
      setCurrentSlide(0);
    }
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
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg group">
      <div className="relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
        {!hasLoaded || !slide ? (
          <div className="absolute inset-0 overflow-hidden bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-400">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_80%_25%,rgba(255,255,255,0.14),transparent_18%),radial-gradient(circle_at_70%_75%,rgba(255,255,255,0.12),transparent_20%)]" />
            <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
              <div className="h-8 w-28 rounded-full bg-white/80 animate-pulse" />
              <div className="flex items-end justify-between gap-4">
                <div className="space-y-3">
                  <div className="h-10 w-56 rounded-full bg-white/20 animate-pulse" />
                  <div className="h-4 w-72 rounded-full bg-white/15 animate-pulse" />
                </div>
                <div className="hidden sm:block h-12 w-24 rounded-xl bg-white/15 animate-pulse" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {slide.type === 'video' && slide.videoSrc ? (
              <>
                <video
                  ref={videoRef}
                  src={slide.videoSrc}
                  poster={slide.videoPoster}
                  className="absolute inset-0 w-full h-full object-cover"
                  autoPlay
                  muted={isMuted}
                  loop
                  onEnded={nextSlide}
                  playsInline
                />
                {slide.overlayOpacity > 0 && (
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"
                    style={{ opacity: slide.overlayOpacity }}
                  />
                )}
                <button
                  onClick={toggleMute}
                  className="absolute top-4 right-4 z-30 bg-black/50 hover:bg-black/70 text-white p-2 md:p-3 rounded-full shadow-lg transition-all"
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 md:w-5 md:h-5" />
                  ) : (
                    <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                  )}
                </button>
              </>
            ) : slide.backgroundImage ? (
              <>
                <Image
                  src={slide.backgroundImage}
                  alt={slide.title || 'Hero banner'}
                  fill
                  className="object-cover"
                  priority
                  sizes="100vw"
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

            <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6 z-20">
              <div className="flex justify-start">
                <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg">
                  <p className="text-[10px] md:text-xs font-bold text-primary-700 uppercase tracking-wider">
                    JulineMart
                  </p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={slide.primaryButton.link}
                    className="rounded-lg bg-white px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold text-primary-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    {slide.primaryButton.text}
                  </Link>
                  <Link
                    href={slide.secondaryButton.link}
                    className="rounded-lg bg-white/20 backdrop-blur-md border-2 border-white px-3 py-1.5 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-white/30"
                  >
                    {slide.secondaryButton.text}
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {activeSlides.length > 1 && hasLoaded && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 md:p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {activeSlides.length > 1 && hasLoaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
