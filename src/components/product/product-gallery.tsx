'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProductImage } from '@/types/product';
import ActualProductPhotoBadge from '@/components/product/ActualProductPhotoBadge';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
  /**
   * Mobile tier: below md, show a full-bleed swipe gallery (scroll-snap) with a
   * counter instead of arrows + thumbnails. md and up are unchanged.
   */
  edgeToEdge?: boolean;
}

export default function ProductGallery({ images, productName, edgeToEdge = false }: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const isRemoteImage = (src: string) => /^https?:\/\//i.test(src);

  // Reset to first image whenever the images array changes (e.g. variation selected)
  useEffect(() => {
    setSelectedImage(0);
    swipeRef.current?.scrollTo({ left: 0 });
  }, [images]);

  const goToPrevious = () => {
    setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image available</span>
      </div>
    );
  }

  const currentImage = images[selectedImage];
  const showSellerPhotoBadge = currentImage?.photo_source === 'seller_actual';

  return (
    <div className="space-y-4">
      {edgeToEdge && (
        <div className="relative bg-white md:hidden">
          <div
            ref={swipeRef}
            className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
            onScroll={(event) => {
              const el = event.currentTarget;
              const index = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (index !== selectedImage) setSelectedImage(index);
            }}
          >
            {images.map((image, index) => (
              <div key={`${image.src || 'image'}-${index}`} className="relative aspect-[1/0.92] w-full flex-none snap-start">
                <Image
                  src={image.src}
                  alt={image.alt || `${productName} - Image ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-contain px-8 pb-4 pt-14"
                  onClick={() => setIsModalOpen(true)}
                  priority={index === 0}
                  unoptimized={isRemoteImage(image.src)}
                />
              </div>
            ))}
          </div>
          {showSellerPhotoBadge && (
            <div className="absolute bottom-3 left-4 z-10">
              <ActualProductPhotoBadge compact />
            </div>
          )}
          {images.length > 1 && (
            <div className="absolute bottom-3 right-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white tabular-nums">
              {selectedImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* Main Image */}
      <div className={`relative aspect-square rounded-lg overflow-hidden bg-gray-100 group ${edgeToEdge ? 'max-md:hidden' : ''}`}>
        {showSellerPhotoBadge && (
          <div className="absolute left-2 top-2 z-10">
            <ActualProductPhotoBadge compact />
          </div>
        )}
        <Image
          src={currentImage.src}
          alt={currentImage.alt || productName}
          fill
          className="object-cover cursor-zoom-in"
          onClick={() => setIsModalOpen(true)}
          priority
          unoptimized={isRemoteImage(currentImage.src)}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-gray-700" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Images */}
      {images.length > 1 && (
        <div className={`flex gap-2 overflow-x-auto scrollbar-hide ${edgeToEdge ? 'max-md:hidden' : ''}`}>
          {images.map((image, index) => (
            <button
              key={`${image.src || 'image'}-${index}`}
              onClick={() => setSelectedImage(index)}
              className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImage === index
                  ? 'border-primary-600 ring-2 ring-primary-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Image
                src={image.src}
                alt={image.alt || `${productName} - Image ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized={isRemoteImage(image.src)}
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <button
            onClick={() => setIsModalOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center z-0">
            <Image
              src={images[selectedImage].src}
              alt={images[selectedImage].alt || productName}
              fill
              className="object-contain pointer-events-none"
              sizes="100vw"
              unoptimized={isRemoteImage(currentImage.src)}
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white px-4 py-2 rounded-full z-10">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      )}

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
