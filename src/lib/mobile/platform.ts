// Runtime checks for native enhancements (haptics, Back button). Never use these
// to decide layout: layout is CSS-only (md: breakpoint) so SSR HTML stays identical.

type CapacitorGlobal = { isNativePlatform?: () => boolean };

/**
 * True inside the Android/iOS app. `window.Capacitor` is only injected by the
 * native bridge; importing @capacitor/core in a plain browser crashes some
 * in-app browsers (see StatusBarManager), so check the global first.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/** True for an installed PWA (home-screen launch), not the native app. */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
