// Recent searches for the mobile search view: per device, newest first.

const STORAGE_KEY = 'jm_recent_searches';
const MAX_RECENT = 8;

/** Newest first, case-insensitive de-duplication, capped. */
export function withRecentSearch(list: string[], term: string): string[] {
  const clean = term.trim().replace(/\s+/g, ' ');
  if (!clean) return list;
  const rest = list.filter((item) => item.toLowerCase() !== clean.toLowerCase());
  return [clean, ...rest].slice(0, MAX_RECENT);
}

export function readRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string): string[] {
  const next = withRecentSearch(readRecentSearches(), term);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked (private mode): keep the in-memory list only */
  }
  return next;
}

export function clearRecentSearches(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// Tiny external store so components read the list with useSyncExternalStore
// (server snapshot is empty; the client snapshot fills in after hydration).
const listeners = new Set<() => void>();
let snapshot: string[] | null = null;
const EMPTY: string[] = [];

export function subscribeRecentSearches(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentSearchesSnapshot(): string[] {
  if (snapshot === null) snapshot = readRecentSearches();
  return snapshot;
}

export function getRecentSearchesServerSnapshot(): string[] {
  return EMPTY;
}

/** Update the shared snapshot after a save/clear and notify readers. */
export function publishRecentSearches(next: string[]): void {
  snapshot = next;
  listeners.forEach((listener) => listener());
}
