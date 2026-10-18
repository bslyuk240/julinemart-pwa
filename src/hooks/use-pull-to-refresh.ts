import { useEffect, useRef, useState } from 'react';
import { hasOpenOverlay } from '@/lib/mobile/back-stack';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  targetRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Lightweight pull-to-refresh for mobile web.
 * Listens to touch events at the top of the page and triggers a refresh callback.
 *
 * Skipped when the primary pointer is "fine" (mouse / trackpad): on Windows,
 * two-finger trackpad scrolling can synthesize touch events; our touchmove +
 * preventDefault() would block that scrolling while the scrollbar still works.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 140,
  disabled = false,
  targetRef,
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (disabled) return undefined;
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches) {
      return undefined;
    }

    const target = (targetRef?.current ?? window) as HTMLElement | Window;

    // On iOS Safari, block the native rubber-band bounce so our handler can run.
    const root: HTMLElement = target instanceof Window ? document.documentElement : target;
    const scrollElement: HTMLElement = target instanceof Window ? document.body : target;
    const previousOverscroll = root.style.overscrollBehavior;
    const previousScrollOverscroll = scrollElement.style.overscrollBehaviorY;
    root.style.overscrollBehavior = 'contain';
    scrollElement.style.overscrollBehaviorY = 'contain';

    const handleStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;
      // Dragging a bottom sheet down must close the sheet, not reload the page.
      if (hasOpenOverlay()) return;
      // A finger dragging down inside a scrolled inner list (e.g. the gift
      // builder's item grid) is scrolling that list back up, not pulling the page.
      if (startsInScrolledContainer(event.target, root)) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
      // Do not set touchAction = 'none' here: it blocks normal page scroll (finger moving up)
      // for the whole gesture until touchend — scrollbar still works, wheel/trackpad feels broken.
    };

    const handleMove = (event: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null) return;

      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) {
        pullingRef.current = false;
        startYRef.current = null;
        distanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const currentY = event.touches[0].clientY;
      const delta = currentY - startYRef.current;

      if (delta > 0) {
        // Prevent the native browser rubber-band bounce while pulling
        try {
          event.preventDefault();
        } catch {
          /* noop */
        }
        const distance = Math.min(delta, maxPull);
        distanceRef.current = distance;
        setPullDistance(distance);
      } else {
        pullingRef.current = false;
        startYRef.current = null;
        distanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const handleEnd = async () => {
      if (!pullingRef.current) return;

      pullingRef.current = false;
      const shouldRefresh = distanceRef.current >= threshold;
      distanceRef.current = 0;
      setPullDistance(0);

      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    const handleCancel = () => {
      pullingRef.current = false;
      startYRef.current = null;
      distanceRef.current = 0;
      setPullDistance(0);
    };

    target.addEventListener('touchstart', handleStart as EventListener, { passive: false });
    target.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    target.addEventListener('touchend', handleEnd as EventListener);
    target.addEventListener('touchcancel', handleCancel as EventListener);

    return () => {
      root.style.overscrollBehavior = previousOverscroll;
      scrollElement.style.overscrollBehaviorY = previousScrollOverscroll;
      target.removeEventListener('touchstart', handleStart as EventListener);
      target.removeEventListener('touchmove', handleMove as EventListener);
      target.removeEventListener('touchend', handleEnd as EventListener);
      target.removeEventListener('touchcancel', handleCancel as EventListener);
    };
  }, [onRefresh, threshold, maxPull, disabled, isRefreshing, targetRef]);

  return { pullDistance, isRefreshing };
}

/** True when the touch began inside a vertically scrollable element that is not at its top. */
function startsInScrolledContainer(target: EventTarget | null, boundary: HTMLElement): boolean {
  let el = target instanceof Element ? target : null;
  while (el && el !== boundary && el !== document.body && el !== document.documentElement) {
    if (el instanceof HTMLElement && el.scrollTop > 0) {
      const overflowY = window.getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return true;
    }
    el = el.parentElement;
  }
  return false;
}
