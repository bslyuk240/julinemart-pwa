import { useEffect, useState } from 'react';

// One request per page load, shared by the header banner and product pages.
let thresholdPromise: Promise<number | null> | null = null;

function loadThreshold(): Promise<number | null> {
  if (!thresholdPromise) {
    thresholdPromise = fetch('/api/jlo/free-shipping')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => (typeof data?.threshold === 'number' ? data.threshold : null))
      .catch(() => {
        thresholdPromise = null;
        return null;
      });
  }
  return thresholdPromise;
}

/**
 * Minimum order value for the live free-shipping offer, or null when none is running.
 * `loading` stays true until the answer is known, so callers can avoid showing a claim early.
 */
export function useFreeShipping() {
  const [threshold, setThreshold] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadThreshold().then((value) => {
      if (cancelled) return;
      setThreshold(value);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { threshold, loading };
}
