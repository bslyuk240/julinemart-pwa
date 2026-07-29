'use client';

import { useEffect } from 'react';

/**
 * Gap between the visual viewport bottom and `window.innerHeight` (layout viewport height).
 * Exposed as `--jm-vv-bottom-inset` on `<html>` — use as `bottom` on fixed footers so they track
 * mobile browser chrome instead of leaving a strip of visible page content underneath.
 */
export function useVisualViewportBottomInsetSync() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    const root = document.documentElement;

    const sync = () => {
      const inset = Math.max(
        0,
        Math.round(window.innerHeight - vv.offsetTop - vv.height)
      );
      root.style.setProperty('--jm-vv-bottom-inset', `${inset}px`);
    };

    sync();

    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
      root.style.removeProperty('--jm-vv-bottom-inset');
    };
  }, []);
}
