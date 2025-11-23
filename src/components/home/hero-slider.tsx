'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Hero Slider with Gradient Fallback
// Will show gradient until you add images to public/images/
const slides = [
  {
    id: 1,
    primaryButton: {
      text: 'Start shopping',
      link: '/products',
    },
    secondaryButton: {
      text: 'View deals',
      link: '/products?tag=deal',
    },
    
    // OPTION 1: Use your own image (recommended)
    // Uncomment and add your image path:
    // backgroundImage: '/images/hero-slide-1.jpg',
    
    // OPTION 2: Use gradient (current fallback)
    useGradient: true,
    gradientColors: 'from-primary-600 via-primary-500 to-secondary-400',
    
    // Optional overlay
    overlayOpacity: 0,
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <div className="relative overflow-hidden rounded-xl md:rounded-2xl shadow-lg group">
      {/* Slide Container */}
      <div className="relative w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
        
        {/* Background - Image or Gradient */}
        {slide.backgroundImage ? (
          // Show image if provided
          <>
            <Image
              src={slide.backgroundImage}
              alt="Hero banner"
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
          // Show gradient fallback if no image
          <div 
            className={`absolute inset-0 bg-gradient-to-r ${
              slide.useGradient ? slide.gradientColors : 'from-primary-600 via-primary-500 to-secondary-400'
            }`}
          />
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-6">
          
          {/* TOP: JulineMart branding */}
          <div className="flex justify-start">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-lg">
              <p className="text-[10px] md:text-xs font-bold text-primary-700 uppercase tracking-wider">
                JulineMart
              </p>
            </div>
          </div>

          {/* BOTTOM: Buttons */}
          <div className="flex justify-start">
            <div className="flex flex-wrap gap-2 md:gap-3">
              <Link
                href={slide.primaryButton.link}
                className="rounded-lg bg-white 
                  px-4 py-2 md:px-6 md:py-3 
                  text-xs md:text-sm 
                  font-semibold text-primary-700 
                  shadow-lg
                  transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {slide.primaryButton.text}
              </Link>
              <Link
                href={slide.secondaryButton.link}
                className="rounded-lg bg-white/20 backdrop-blur-md border-2 border-white 
                  px-4 py-2 md:px-6 md:py-3 
                  text-xs md:text-sm 
                  font-semibold text-white 
                  shadow-lg
                  transition hover:-translate-y-0.5 hover:bg-white/30"
              >
                {slide.secondaryButton.text}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (only show if multiple slides) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 
              bg-white/90 hover:bg-white 
              text-gray-800 
              p-2 md:p-3 
              rounded-full 
              shadow-lg 
              opacity-0 group-hover:opacity-100 
              transition-opacity
              z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 
              bg-white/90 hover:bg-white 
              text-gray-800 
              p-2 md:p-3 
              rounded-full 
              shadow-lg 
              opacity-0 group-hover:opacity-100 
              transition-opacity
              z-20"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
          </button>
        </>
      )}

      {/* Slide Indicators (only show if multiple slides) */}
      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide 
                  ? 'w-8 bg-white' 
                  : 'w-2 bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}