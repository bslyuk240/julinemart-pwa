import Link from 'next/link';
import { Gift } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format-price';
import type { GiftBox } from '@/types/gifts';

type Props = {
  box: GiftBox;
  compact?: boolean;
  grid?: boolean;
};

export default function GiftBoxCard({ box, compact, grid }: Props) {
  const widthClass = grid
    ? 'w-full'
    : compact
      ? 'w-[168px] sm:w-[188px]'
      : 'w-[152px] sm:w-[168px] md:w-full md:flex-shrink';

  return (
    <article
      className={`group flex flex-shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow md:rounded-2xl md:hover:shadow-md ${widthClass}`}
    >
    <Link
      href={`/gifts/boxes/${box.slug}`}
      className="block min-w-0 active:scale-[0.98] md:active:scale-100"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {box.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={box.image_url}
            alt={box.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Gift className="h-9 w-9 text-gray-300 md:h-12 md:w-12" />
          </div>
        )}
      </div>
      <div className="p-2.5 md:p-3">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-gray-900 md:text-sm">
          {box.name}
        </p>
        {box.description && !compact ? (
          <p className="mt-0.5 line-clamp-1 hidden text-xs text-gray-500 md:block">{box.description}</p>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between gap-2 md:mt-2">
          <span className="text-[13px] font-bold text-gray-900 md:text-sm md:text-primary-700">
            {formatPrice(box.list_price)}
          </span>
          <span className="text-[10px] text-gray-400 md:text-[11px] md:text-gray-500">
            {box.item_count} items
          </span>
        </div>
      </div>
    </Link>
    <div className="px-2.5 pb-2.5 md:px-3 md:pb-3">
      <Link
        href={`/gifts/checkout?box=${encodeURIComponent(box.slug)}`}
        className="flex w-full items-center justify-center rounded bg-primary-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-700 md:py-2 md:text-sm"
      >
        Send this gift
      </Link>
    </div>
    </article>
  );
}
