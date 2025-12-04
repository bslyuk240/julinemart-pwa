import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
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
}: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (disabled) return undefined;

    // On iOS Safari, block the native rubber-band bounce so our handler can run.
    const root = document.documentElement;
    const body = document.body;
    const previousOverscroll = root.style.overscrollBehavior;
    const previousBodyOverscroll = body.style.overscrollBehaviorY;
    const previousBodyTouchAction = body.style.touchAction;
    root.style.overscrollBehavior = 'contain';
    body.style.overscrollBehaviorY = 'contain';

    const handleStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      if (scrollTop > 0) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
      // Temporarily disable body touch scrolling to prevent rubber-band
      body.style.touchAction = 'none';
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

      if (shouldRefresh && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    window.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      root.style.overscrollBehavior = previousOverscroll;
      body.style.overscrollBehaviorY = previousBodyOverscroll;
      body.style.touchAction = previousBodyTouchAction;
      window.removeEventListener('touchstart', handleStart);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [onRefresh, threshold, maxPull, disabled, isRefreshing]);

  return { pullDistance, isRefreshing };
}
