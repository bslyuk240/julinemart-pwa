'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { X, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import type { CampaignSummary } from '@/types/campaigns';
import { safeStorage } from '@/lib/safe-storage';
import { pushOverlay } from '@/lib/mobile/back-stack';
import { CampaignOffersList } from '@/components/campaigns/CampaignOfferCard';

const DISMISSED_KEY = 'jm_campaign_offers_popup_dismissed';
const DISMISS_COOLDOWN_HOURS = 24;
const SWIPE_DISMISS_PX = 96;

interface CampaignOffersPopupProps {
  campaigns: CampaignSummary[];
}

function isDismissedRecently(): boolean {
  const raw = safeStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  if (Number.isNaN(dismissedAt)) return false;
  const hoursSince = (Date.now() - dismissedAt) / (1000 * 60 * 60);
  return hoursSince < DISMISS_COOLDOWN_HOURS;
}

/**
 * Campaign offers, shown once a day on the homepage. Desktop: a centred dialog.
 * Phones (max-md:): a bottom sheet that slides up, closes on swipe down, scrim
 * tap or the Android Back button.
 */
export default function CampaignOffersPopup({ campaigns }: CampaignOffersPopupProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    safeStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
    setEntered(false);
  }, []);

  useEffect(() => {
    if (pathname !== '/' || campaigns.length === 0 || isDismissedRecently()) return;

    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname, campaigns.length]);

  // While open: slide in, lock page scroll, let Back and Escape close it.
  useEffect(() => {
    if (!visible) return undefined;
    const previousFocus = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      setEntered(true);
      panelRef.current?.focus();
    });
    const popOverlay = pushOverlay(dismiss);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
      if (event.key === 'Tab') trapFocus(event, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(frame);
      popOverlay();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      previousFocus?.focus?.();
    };
  }, [visible, dismiss]);

  if (!visible || campaigns.length === 0) return null;

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current !== null) setDrag(Math.max(0, event.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (drag > SWIPE_DISMISS_PX) dismiss();
    setDrag(0);
  };

  return (
    <div
      className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm max-md:overflow-hidden max-md:bg-m-scrim max-md:backdrop-blur-none"
      onClick={dismiss}
    >
      <div className="flex min-h-full items-center justify-center p-4 pb-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--jm-vv-bottom-inset,0px)+1rem)] max-md:!items-end max-md:!p-0 sm:pb-4">
        <div
          className={clsx(
            'flex w-full max-w-md max-h-[min(85dvh,calc(100dvh-4rem-env(safe-area-inset-bottom,0px)-var(--jm-vv-bottom-inset,0px)-2rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl',
            'max-md:!max-h-[86dvh] max-md:max-w-none max-md:rounded-b-none max-md:rounded-t-m-sheet max-md:bg-m-surface-low max-md:shadow-[0_-8px_24px_rgb(30_26_31/0.16)]',
            drag === 0 && 'max-md:transition-transform max-md:duration-300 max-md:ease-m-decelerate motion-reduce:transition-none',
            !entered && 'max-md:translate-y-full',
          )}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="campaign-offers-title"
          tabIndex={-1}
          style={drag > 0 ? { transform: `translateY(${drag}px)` } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="grid h-9 flex-none touch-none place-items-center md:hidden"
            aria-hidden
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="h-1 w-8 rounded-full bg-m-outline opacity-60" />
          </div>
          <div className="shrink-0 border-b border-gray-100 p-5 pb-4 max-md:border-0 max-md:px-6 max-md:pb-2 max-md:pr-2 max-md:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-100 text-primary-700 max-md:h-10 max-md:w-10 max-md:rounded-full max-md:bg-m-tertiary-container max-md:text-m-on-tertiary-container">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="campaign-offers-title" className="text-lg font-extrabold text-gray-900 max-md:text-m-title-l max-md:text-m-on-surface">
                    Campaign offers
                  </h2>
                  <p className="text-sm text-gray-500 max-md:text-m-body-m max-md:text-m-on-surface-variant">Limited deals — tap to explore</p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 max-md:h-12 max-md:w-12 max-md:text-m-on-surface-variant"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3 max-md:px-4">
            <CampaignOffersList campaigns={campaigns} />
          </div>

          <div className="shrink-0 border-t border-gray-100 p-5 pt-3 max-md:flex max-md:flex-col max-md:gap-1 max-md:border-m-outline-variant max-md:px-6 max-md:pb-[calc(12px+var(--m-safe-bottom))]">
            {campaigns.length === 1 && (
              <Link
                href={`/campaigns/${campaigns[0].slug}`}
                onClick={dismiss}
                className="flex h-12 items-center justify-center rounded-full bg-m-primary text-m-label-l text-m-on-primary md:hidden"
              >
                Shop the offer
              </Link>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="w-full rounded-xl py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 max-md:h-12 max-md:rounded-full max-md:py-0 max-md:text-m-label-l max-md:text-m-primary max-md:hover:bg-transparent max-md:active:bg-m-primary/10"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
