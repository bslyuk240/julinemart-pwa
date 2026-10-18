import { isNativeApp } from './platform';

export type HapticKind = 'tap' | 'selection' | 'success' | 'warning';

// Web fallback lengths (ms) for navigator.vibrate on Android browsers.
const WEB_PATTERN: Record<HapticKind, number | number[]> = {
  tap: 8,
  selection: 5,
  success: [10, 40, 14],
  warning: [18, 60, 18],
};

/**
 * Fire-and-forget haptic feedback.
 * - App: @capacitor/haptics (no-op on installs built before the plugin shipped).
 * - Android web: navigator.vibrate.
 * - Everywhere else: nothing.
 */
export function haptic(kind: HapticKind = 'tap'): void {
  if (typeof window === 'undefined') return;

  if (isNativeApp()) {
    void nativeHaptic(kind);
    return;
  }

  try {
    navigator.vibrate?.(WEB_PATTERN[kind]);
  } catch {
    /* vibrate can throw without user activation */
  }
}

async function nativeHaptic(kind: HapticKind) {
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    switch (kind) {
      case 'tap':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'selection':
        await Haptics.selectionChanged();
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
    }
  } catch {
    // Plugin missing from this app build: degrade silently.
  }
}
