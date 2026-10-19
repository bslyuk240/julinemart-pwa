'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { hasInAppHistory } from '@/lib/mobile/nav-history';

type MobileTopBarProps = {
  title?: ReactNode;
  /** Logical parent, used when the shopper landed here from outside the app. Omit for root tabs. */
  backHref?: string;
  /** Overrides Back (e.g. step back inside a multi-step flow). Shows the Back button even without backHref. */
  onBack?: () => void;
  /** Small line under the title, e.g. "Step 2 of 4". */
  subtitle?: ReactNode;
  /** Up to two icon buttons, e.g. <TopBarAction />. */
  actions?: ReactNode;
  /**
   * `small`: solid bar with title (default).
   * `overlay`: transparent over a hero image; turns solid and shows the title once scrolled.
   */
  variant?: 'small' | 'overlay';
};

/** Material 3 top app bar. Mobile only (`md:hidden`); desktop keeps the site header. */
export default function MobileTopBar({ title, backHref, onBack, subtitle, actions, variant = 'small' }: MobileTopBarProps) {
  const router = useRouter();
  const scrolled = useScrolled(8);
  const solid = variant === 'small' || scrolled;

  const goBack = () => {
    if (onBack) onBack();
    else if (hasInAppHistory()) router.back();
    else router.push(backHref ?? '/');
  };

  return (
    <header
      className={clsx(
        'sticky top-0 z-m-header flex h-16 items-center gap-1 px-1 transition-colors duration-200 ease-m-standard md:hidden',
        variant === 'overlay' && '-mb-16',
        // At rest the bar takes the page's own surface (white or tinted); once content scrolls under it, it tints.
        solid ? (scrolled ? 'bg-m-surface-container' : 'bg-inherit') : 'bg-transparent',
      )}
    >
      {(backHref !== undefined || onBack) && (
        <TopBarAction label="Back" onClick={goBack} onImage={!solid}>
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </TopBarAction>
      )}
      <div
        className={clsx(
          'min-w-0 flex-1 pl-1 transition-opacity duration-200',
          !solid && 'opacity-0',
          backHref === undefined && !onBack && 'pl-3',
        )}
      >
        <h1
          className={clsx(
            'truncate text-m-on-surface',
            variant === 'overlay' || subtitle ? 'text-lg font-medium leading-6' : 'text-m-title-l',
          )}
        >
          {title}
        </h1>
        {subtitle && <p className="truncate text-m-body-s text-m-on-surface-variant">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

type TopBarActionProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  badge?: number;
  /** Floating over a photo: white circular backing for legibility. */
  onImage?: boolean;
  children: ReactNode;
};

/** 48px icon button for the top bar. */
export function TopBarAction({ label, onClick, href, badge = 0, onImage = false, children }: TopBarActionProps) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={badge > 0 ? `${label}, ${badge} items` : label}
      onClick={onClick ?? (href ? () => router.push(href) : undefined)}
      className={clsx(
        'relative grid shrink-0 place-items-center rounded-full transition-colors active:bg-black/10',
        onImage
          ? 'm-1 h-10 w-10 bg-white/90 text-m-on-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]'
          : 'h-12 w-12 text-m-on-surface-variant',
      )}
    >
      {children}
      {badge > 0 && (
        <span className="absolute right-1 top-1.5 min-w-4 rounded-full bg-m-error px-1 text-center text-[11px] font-semibold leading-4 text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function useScrolled(threshold: number) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}
