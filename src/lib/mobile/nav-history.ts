// In-app navigation trail, so the top bar's Back can choose between
// router.back() (shopper came from inside the app) and a logical parent href
// (shopper landed here from WhatsApp, an ad or a push notification).

const trail: string[] = [];

/** Record a pathname change. Returning to the previous entry counts as Back. */
export function recordNavigation(pathname: string): void {
  if (trail[trail.length - 1] === pathname) return;
  if (trail.length >= 2 && trail[trail.length - 2] === pathname) {
    trail.pop();
    return;
  }
  trail.push(pathname);
  if (trail.length > 50) trail.shift();
}

export function hasInAppHistory(): boolean {
  return trail.length > 1;
}

/** Test helper. */
export function resetNavigationTrail(): void {
  trail.length = 0;
}
