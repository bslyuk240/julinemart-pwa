'use client';

import { useVisualViewportBottomInsetSync } from '@/hooks/use-visual-viewport-bottom-inset';

/** Keeps `--jm-vv-bottom-inset` updated so fixed bottom bars track mobile browser chrome / visual viewport. */
export default function VisualViewportBottomSync() {
  useVisualViewportBottomInsetSync();
  return null;
}
