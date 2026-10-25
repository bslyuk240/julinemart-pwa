import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type AutoAdvanceOptions = {
  /** Number of slides (the track's children). */
  count: number;
  /** Time on each slide. */
  intervalMs: number;
  /** Wait before the first move, so carousels on one screen don't move together. */
  delayMs?: number;
};

/**
 * Drives a horizontal scroll-snap track: tracks which slide is in front, moves
 * to the next one on a timer (wrapping at the end). It holds while hovered or
 * focused and while off screen, stops for the rest of the visit once the shopper
 * touches it or picks a slide, and never moves when they prefer reduced motion. The track must be `position: relative` so its
 * children's offsetLeft is measured from the track.
 */
export function useAutoAdvance(trackRef: RefObject<HTMLElement | null>, { count, intervalMs, delayMs = 0 }: AutoAdvanceOptions) {
  const [index, setIndex] = useState(0);
  const [scrollable, setScrollable] = useState(false);
  const indexRef = useRef(0);
  const stopped = useRef(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const onScreen = useRef(true);

  const goTo = useCallback(
    (next: number, smooth = true) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const target = (next + count) % count;
      const slide = track.children[target] as HTMLElement | undefined;
      if (!slide) return;
      const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      track.scrollTo({ left: slide.offsetLeft - padding, behavior: smooth ? 'smooth' : 'auto' });
    },
    [trackRef, count],
  );

  // Follow the shopper's own swipes.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const padding = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const slides = Array.from(track.children) as HTMLElement[];
        let best = 0;
        slides.forEach((slide, i) => {
          if (Math.abs(slide.offsetLeft - padding - track.scrollLeft) < Math.abs(slides[best].offsetLeft - padding - track.scrollLeft)) best = i;
        });
        if (track.scrollLeft >= track.scrollWidth - track.clientWidth - 2 && slides.length > 0) {
          // At the end of a multi-item row, light the last dot.
          best = Math.max(best, slides.length - 1);
        }
        indexRef.current = best;
        setIndex(best);
      });
    };
    const stop = () => {
      stopped.current = true;
    };
    const focusIn = () => {
      focused.current = true;
    };
    const focusOut = (event: FocusEvent) => {
      if (!track.contains(event.relatedTarget as Node | null)) focused.current = false;
    };
    // Mouse only: phones fire a compatibility mouseenter after a tap and no mouseleave.
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') hovered.current = true;
    };
    const leave = () => {
      hovered.current = false;
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    track.addEventListener('pointerdown', stop, { passive: true });
    track.addEventListener('focusin', focusIn);
    track.addEventListener('focusout', focusOut);
    track.addEventListener('pointerenter', enter);
    track.addEventListener('pointerleave', leave);
    const observer = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting;
    });
    observer.observe(track);
    const measure = () => setScrollable(track.scrollWidth > track.clientWidth + 2);
    const resize = new ResizeObserver(measure);
    resize.observe(track);
    measure();
    return () => {
      resize.disconnect();
      cancelAnimationFrame(frame);
      track.removeEventListener('scroll', onScroll);
      track.removeEventListener('pointerdown', stop);
      track.removeEventListener('focusin', focusIn);
      track.removeEventListener('focusout', focusOut);
      track.removeEventListener('pointerenter', enter);
      track.removeEventListener('pointerleave', leave);
      observer.disconnect();
    };
  }, [trackRef, count]);

  useEffect(() => {
    if (count <= 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        if (document.hidden || !onScreen.current || hovered.current || focused.current || stopped.current) return;
        const track = trackRef.current;
        if (!track || track.scrollWidth <= track.clientWidth + 2) return;
        // A row showing several items can't scroll its last ones to the front: wrap once the end is in view.
        const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
        goTo(atEnd ? 0 : indexRef.current + 1);
      }, intervalMs);
    }, delayMs);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [count, intervalMs, delayMs, goTo, trackRef]);

  /** A slide the shopper picked (a dot): go there and stop moving on our own. */
  const select = useCallback(
    (next: number) => {
      stopped.current = true;
      goTo(next);
    },
    [goTo],
  );

  /** `scrollable` is false when every slide already fits, so dots would only mislead. */
  return { index, select, scrollable };
}
