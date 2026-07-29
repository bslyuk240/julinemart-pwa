/**
 * Safe localStorage wrapper.
 *
 * On Android Chrome, localStorage throws SecurityError (DOMException code 18 —
 * "Access is denied for this document") when the user has cookies/storage
 * blocked in browser privacy settings. All operations here gracefully degrade:
 * reads return null, writes silently no-op.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage blocked — non-critical, skip silently
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked — non-critical, skip silently
    }
  },
};
