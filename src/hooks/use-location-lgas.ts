'use client';

import { useEffect, useMemo, useState } from 'react';

export type LocationLgaEntry = { id: string; lga: string; supports_local_delivery: boolean };
type Grouped = Record<string, Record<string, LocationLgaEntry[]>>;

// Module-level cache — the state→city→LGA list rarely changes and every
// checkout surface (regular, gift ready-made, gift build-your-own) needs it,
// so fetch it once per page load rather than once per form.
let cachedGrouped: Grouped | null = null;
let cachedPromise: Promise<Grouped> | null = null;

function fetchGrouped(): Promise<Grouped> {
  if (cachedGrouped) return Promise.resolve(cachedGrouped);
  if (!cachedPromise) {
    cachedPromise = fetch('/api/vendor-locations')
      .then((res) => res.json())
      .then((data) => {
        cachedGrouped = data?.grouped || {};
        return cachedGrouped as Grouped;
      })
      .catch(() => {
        cachedGrouped = {};
        return cachedGrouped as Grouped;
      });
  }
  return cachedPromise;
}

/**
 * LGA options for a given state+city, sourced from the same
 * approved_vendor_locations data the Vendor Locations admin page manages.
 * Returns an empty list for any city not curated there — callers should
 * fall back to a free-text field in that case rather than block checkout.
 */
export function useLocationLgas(state: string, city: string): LocationLgaEntry[] {
  const [grouped, setGrouped] = useState<Grouped>(cachedGrouped || {});

  useEffect(() => {
    let cancelled = false;
    fetchGrouped().then((g) => {
      if (!cancelled) setGrouped(g);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const cityMap = grouped[state];
    if (!cityMap) return [];
    const matchedCityKey = Object.keys(cityMap).find(
      (c) => c.trim().toLowerCase() === city.trim().toLowerCase()
    );
    if (!matchedCityKey) return [];
    return (cityMap[matchedCityKey] || []).filter((entry) => entry.lga && entry.lga !== '—');
  }, [grouped, state, city]);
}
