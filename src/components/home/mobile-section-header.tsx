import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

type MobileSectionHeaderProps = {
  id?: string;
  title: string;
  /** Full list. Omit for sections with nothing more to show. */
  href?: string;
  seeAllLabel?: string;
  /** Small icon chip before the title, e.g. the flash-sale zap. */
  cue?: { icon: LucideIcon; className: string };
};

/**
 * Phone homepage section header: one 48px row (title, optional cue, See all).
 * Sections add `pt-3` above it, so every section starts 24px below the last.
 */
export default function MobileSectionHeader({ id, title, href, seeAllLabel = 'See all', cue }: MobileSectionHeaderProps) {
  return (
    <div className={clsx('flex min-h-12 items-center gap-2 pl-4', href ? 'pr-1' : 'pr-4')}>
      {cue && (
        <span className={clsx('grid h-7 w-7 flex-none place-items-center rounded-lg', cue.className)} aria-hidden>
          <cue.icon className="h-[18px] w-[18px]" />
        </span>
      )}
      <h2 id={id} className="min-w-0 flex-1 truncate text-m-title-m text-m-on-surface">
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="flex h-12 flex-none items-center gap-0.5 rounded-full px-3 text-m-label-l text-m-primary active:bg-m-primary/10"
        >
          {seeAllLabel}
          <ChevronRight className="h-[18px] w-[18px]" aria-hidden />
        </Link>
      )}
    </div>
  );
}
