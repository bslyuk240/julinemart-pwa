'use client';

import { clsx } from 'clsx';

type CarouselDotsProps = {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** Label for each dot, e.g. "Banner" gives "Go to banner 2". */
  label: string;
  /** White dots over a photo (desktop panels) instead of tonal dots under it. */
  onImage?: boolean;
  className?: string;
};

/** Position dots for a scroll-snap carousel. Each dot sits in a 24px tap target. */
export default function CarouselDots({ count, index, onSelect, label, onImage = false, className }: CarouselDotsProps) {
  if (count <= 1) return null;
  return (
    <div className={clsx('flex justify-center', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(i)}
          aria-label={`Go to ${label.toLowerCase()} ${i + 1}`}
          aria-current={i === index ? 'true' : undefined}
          className="grid h-6 min-w-6 place-items-center px-[9px]"
        >
          <span
            className={clsx(
              'block h-1.5 rounded-full transition-all duration-200 ease-m-standard motion-reduce:transition-none',
              i === index ? 'w-4' : 'w-1.5',
              onImage
                ? i === index
                  ? 'bg-white'
                  : 'bg-white/55'
                : i === index
                  ? 'bg-m-primary'
                  : 'bg-m-outline-variant',
            )}
          />
        </button>
      ))}
    </div>
  );
}
