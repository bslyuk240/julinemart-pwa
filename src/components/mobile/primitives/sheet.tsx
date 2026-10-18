'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { pushOverlay } from '@/lib/mobile/back-stack';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** Small text button beside the title, e.g. "Clear all". */
  headerAction?: ReactNode;
  /** Pinned footer, e.g. a full-width "Show results" button. */
  footer?: ReactNode;
  children: ReactNode;
};

const EXIT_MS = 200;
const DISMISS_PX = 96;

/**
 * Material 3 modal bottom sheet. Mounted only while open (portal), so it adds
 * nothing to the SSR HTML. Closes on scrim tap, swipe down, Escape and the
 * Android Back button (via the overlay back stack).
 */
export default function Sheet({ open, onClose, title, headerAction, footer, children }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const [drag, setDrag] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Mount as soon as `open` flips; unmount only after the exit transition.
  if (open && !mounted) setMounted(true);

  // Flip `visible` a frame after mounting so the enter transition runs.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(open));
    if (open) return () => cancelAnimationFrame(frame);
    const timer = setTimeout(() => setMounted(false), EXIT_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [open]);

  // While open: back stack, Escape, scroll lock, focus.
  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement as HTMLElement | null;
    const popOverlay = pushOverlay(() => onCloseRef.current());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab') trapFocus(event, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    const frame = requestAnimationFrame(() => panelRef.current?.focus());

    return () => {
      cancelAnimationFrame(frame);
      popOverlay();
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current === null) return;
    setDrag(Math.max(0, event.clientY - dragStart.current));
  }, []);

  const onPointerUp = useCallback(() => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    setDrag((distance) => {
      if (distance > DISMISS_PX) onCloseRef.current();
      return 0;
    });
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-m-scrim">
      <div
        aria-hidden
        onClick={onClose}
        className={clsx(
          'absolute inset-0 bg-m-scrim transition-opacity duration-200 ease-m-standard motion-reduce:transition-none',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={clsx(
          'absolute inset-x-0 bottom-0 z-m-sheet flex max-h-[86dvh] flex-col rounded-t-m-sheet bg-m-surface-low text-m-on-surface shadow-[0_-8px_24px_rgb(30_26_31/0.16)] outline-none',
          drag === 0 && 'transition-transform motion-reduce:transition-none',
          visible ? 'duration-300 ease-m-decelerate' : 'duration-200 ease-m-accelerate',
        )}
        style={{ transform: visible ? `translateY(${drag}px)` : 'translateY(100%)' }}
      >
        <div
          className="flex-none touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="grid h-9 place-items-center">
            <span className="h-1 w-8 rounded-full bg-m-outline opacity-60" />
          </div>
          {(title || headerAction) && (
            <div className="flex items-center justify-between gap-2 pb-2 pl-6 pr-2">
              {title && (
                <h2 id={titleId} className="text-m-title-l">
                  {title}
                </h2>
              )}
              {headerAction ?? (
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="grid h-12 w-12 place-items-center rounded-full text-m-on-surface-variant active:bg-black/10"
                >
                  <X className="h-6 w-6" aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-4">{children}</div>
        {footer && (
          <div
            className="flex flex-none gap-3 border-t border-m-outline-variant px-6 pt-3"
            style={{ paddingBottom: 'calc(12px + var(--m-safe-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
