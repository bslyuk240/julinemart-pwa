'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

type StickyActionBarProps = {
  children: ReactNode;
  /** Sit above the navigation bar (cart) instead of replacing it (product page, checkout). */
  aboveTabBar?: boolean;
  className?: string;
};

/**
 * Pinned bar for a screen's primary action. Publishes its height as
 * `--m-float-bottom` so floating widgets (support chat) move above it, and
 * leaves a same-height spacer so the end of the page is never hidden under it.
 */
export default function StickyActionBar({ children, aboveTabBar = false, className }: StickyActionBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const mobile = window.matchMedia('(max-width: 767px)');

    const sync = () => {
      if (!mobile.matches) {
        root.style.removeProperty('--m-float-bottom');
        return;
      }
      const measured = Math.round(el.getBoundingClientRect().height);
      setHeight(measured);
      const base = aboveTabBar ? ' + var(--m-tabbar-h)' : '';
      root.style.setProperty(
        '--m-float-bottom',
        `calc(${measured}px + 16px${base} + var(--jm-vv-bottom-inset, 0px))`,
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    mobile.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      mobile.removeEventListener('change', sync);
      root.style.removeProperty('--m-float-bottom');
    };
  }, [aboveTabBar]);

  return (
    <>
      <div aria-hidden className="md:hidden" style={{ height }} />
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'fixed inset-x-0 z-m-bar flex items-center gap-2 bg-m-surface-lowest px-4 pt-3 shadow-[0_-1px_0_var(--m-outline-variant),0_-4px_16px_rgb(30_26_31/0.06)] md:hidden',
            className,
          ),
        )}
        style={{
          bottom: aboveTabBar
            ? 'calc(var(--m-tabbar-h) + var(--jm-vv-bottom-inset, 0px))'
            : 'var(--jm-vv-bottom-inset, 0px)',
          paddingBottom: aboveTabBar ? '12px' : 'calc(12px + var(--m-safe-bottom))',
        }}
      >
        {children}
      </div>
    </>
  );
}
