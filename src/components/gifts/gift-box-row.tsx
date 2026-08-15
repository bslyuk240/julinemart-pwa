import type { GiftBox } from '@/types/gifts';
import GiftBoxCard from './gift-box-card';

type Props = {
  label: string;
  boxes: GiftBox[];
};

/**
 * Mobile: full-bleed horizontal snap row.
 * Desktop: 4 cards per row grid.
 */
export default function GiftBoxRow({ label, boxes }: Props) {
  if (!boxes.length) return null;

  return (
    <div className="mb-4 last:mb-0 md:mb-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:mb-2.5 md:text-sm md:font-medium md:normal-case md:tracking-normal md:text-gray-700">
        {label}
      </p>
      <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 snap-x snap-mandatory scrollbar-none md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 md:snap-none lg:grid-cols-4">
        {boxes.map((box) => (
          <GiftBoxCard key={box.id} box={box} />
        ))}
      </div>
    </div>
  );
}
