import { useEffect, useRef, useState } from 'react';

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
  const previousTouchActionRef = useRef<string | null>(null);

  useEffect(() => {
    if (disabled) return undefined;

    const target = (targetRef?.current ?? window) as HTMLElement | Window;

    // On iOS Safari, block the native rubber-band bounce so our handler can run.
    const root: HTMLElement = target instanceof Window ? document.documentElement : target;
    const scrollElement: HTMLElement = target instanceof Window ? document.body : target;
    const previousOverscroll = root.style.overscrollBehavior;
    const previousScrollOverscroll = scrollElement.style.overscrollBehaviorY;
    const previousScrollTouchAction = scrollElement.style.touchAction;
    previousTouchActionRef.current = previousScrollTouchAction;
    root.style.overscrollBehavior = 'contain';
    scrollElement.style.overscrollBehaviorY = 'contain';

    const handleStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
      // Temporarily disable touch scrolling on the target to prevent rubber-band
      scrollElement.style.touchAction = 'none';
    };

    const handleMove = (event: TouchEvent) => {
      if (!pullingRef.current || startYRef.current === null) return;
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
      // Restore touch action after gesture ends
      scrollElement.style.touchAction = previousTouchActionRef.current || '';

      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    target.addEventListener('touchstart', handleStart as EventListener, { passive: false });
    target.addEventListener('touchmove', handleMove as EventListener, { passive: false });
    target.addEventListener('touchend', handleEnd as EventListener);

    return () => {
      root.style.overscrollBehavior = previousOverscroll;
      scrollElement.style.overscrollBehaviorY = previousScrollOverscroll;
      scrollElement.style.touchAction = previousScrollTouchAction;
      target.removeEventListener('touchstart', handleStart as EventListener);
      target.removeEventListener('touchmove', handleMove as EventListener);
      target.removeEventListener('touchend', handleEnd as EventListener);
    };
  }, [onRefresh, threshold, maxPull, disabled, isRefreshing, targetRef]);

  return { pullDistance, isRefreshing };
}
