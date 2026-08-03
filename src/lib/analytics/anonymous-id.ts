import { safeStorage } from '@/lib/safe-storage';

export function getOrCreateAnonymousId(): string {
  const key = 'jm_anon_id';
  const existing = safeStorage.getItem(key);
  if (existing) return existing;
  const id = crypto.randomUUID();
  safeStorage.setItem(key, id);
  return id;
}
