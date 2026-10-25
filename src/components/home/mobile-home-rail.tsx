'use client';

import { useId } from 'react';
import { Tag, Zap, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import ProductCard from '@/components/product/product-card';
import MobileSectionHeader from '@/components/home/mobile-section-header';
import type { Product } from '@/types/product';

const CUES: Record<'flash' | 'deals', { icon: LucideIcon; className: string }> = {
  flash: { icon: Zap, className: 'bg-m-tertiary-container text-m-on-tertiary-container' },
  deals: { icon: Tag, className: 'bg-m-primary-container text-m-primary' },
};

type MobileHomeRailProps = {
  title: string;
  /** Full list. Rows added in admin have none, so they show no See all. */
  href?: string;
  products: Product[];
  /** Small icon chip before the title, so the urgent rows stand out. */
  cue?: keyof typeof CUES;
  /** Tag on each photo: "New" for launches, the rank for best sellers. */
  tag?: 'new' | 'rank';
};

const tagClass = 'inline-flex h-[22px] items-center rounded-md px-2 text-[11px] font-bold leading-none';

/** Phone homepage row (md:hidden): title, See all, and cards that scroll sideways. */
export default function MobileHomeRail({ title, href, products, cue, tag }: MobileHomeRailProps) {
  const titleId = useId();
  if (products.length === 0) return null;

  return (
    <section className="pt-3 md:hidden" aria-labelledby={titleId}>
      <MobileSectionHeader id={titleId} title={title} href={href} cue={cue ? CUES[cue] : undefined} />
      <div className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {products.slice(0, 12).map((product, i) => (
          <div key={product.id} className="w-[148px] flex-none snap-start">
            <ProductCard
              product={product}
              fullWidth
              mobileTier
              // null still hides the card's own tag badges, which would repeat the row title.
              tierTag={
                tag === 'new' ? (
                  <span className={clsx(tagClass, 'bg-m-success-container text-m-success')}>New</span>
                ) : tag === 'rank' ? (
                  <span className={clsx(tagClass, 'bg-m-inverse-surface text-m-inverse-on-surface')}>#{i + 1}</span>
                ) : null
              }
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Phone placeholder for a rail while the first fetch runs (md:hidden). */
export function MobileHomeRailSkeleton() {
  return (
    <div className="pt-3 md:hidden" aria-hidden>
      <div className="flex min-h-12 items-center px-4">
        <div className="h-5 w-32 animate-pulse rounded bg-m-surface-container" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-[148px] flex-none">
            <div className="aspect-square animate-pulse rounded-m-card bg-m-surface-container" />
            <div className="mt-2 h-4 w-full animate-pulse rounded bg-m-surface-container" />
            <div className="mt-1.5 h-4 w-2/3 animate-pulse rounded bg-m-surface-container" />
          </div>
        ))}
      </div>
    </div>
  );
}
