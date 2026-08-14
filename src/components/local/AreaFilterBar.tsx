'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

export type AreaFilters = {
  state: string;
  city: string;
  area: string;
  pickupOnly: boolean;
};

type AreaFilterBarProps = {
  value: AreaFilters;
  onChange: (next: AreaFilters) => void;
  onUseLocation?: (coords: { latitude: number; longitude: number }) => void;
  showPickupToggle?: boolean;
  className?: string;
};

export default function AreaFilterBar({
  value,
  onChange,
  onUseLocation,
  showPickupToggle = true,
  className = '',
}: AreaFilterBarProps) {
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    fetch('/api/vendors/areas')
      .then((r) => (r.ok ? r.json() : { states: [] }))
      .then((d) => setStates(d.states || []))
      .catch(() => setStates([]));
  }, []);

  useEffect(() => {
    if (!value.state) {
      setCities([]);
      setAreas([]);
      return;
    }
    fetch(`/api/vendors/areas?state=${encodeURIComponent(value.state)}`)
      .then((r) => (r.ok ? r.json() : { cities: [] }))
      .then((d) => setCities(d.cities || []))
      .catch(() => setCities([]));
  }, [value.state]);

  useEffect(() => {
    if (!value.state || !value.city) {
      setAreas([]);
      return;
    }
    fetch(
      `/api/vendors/areas?state=${encodeURIComponent(value.state)}&city=${encodeURIComponent(value.city)}`
    )
      .then((r) => (r.ok ? r.json() : { areas: [] }))
      .then((d) => setAreas(d.areas || []))
      .catch(() => setAreas([]));
  }, [value.state, value.city]);

  const useMyLocation = useCallback(async () => {
    if (!onUseLocation) return;
    setLocating(true);
    try {
      const { requestCurrentPosition } = await import('@/lib/local/geolocation');
      const coords = await requestCurrentPosition();
      onUseLocation(coords);
      toast.success('Location applied — showing nearest stores');
    } catch {
      toast.error('Could not get your location. Pick your area manually.');
    } finally {
      setLocating(false);
    }
  }, [onUseLocation]);

  return (
    <div className={`space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary-600" aria-hidden />
          <span className="text-sm font-semibold text-gray-900">Shop near you</span>
        </div>
        {onUseLocation && (
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 disabled:opacity-60"
          >
            <Navigation className="h-3.5 w-3.5" />
            {locating ? 'Locating…' : 'Use location'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={value.state}
          onChange={(e) =>
            onChange({ state: e.target.value, city: '', area: '', pickupOnly: value.pickupOnly })
          }
          className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm"
          aria-label="State"
        >
          <option value="">All states</option>
          {states.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value, area: '' })}
          disabled={!value.state}
          className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-50"
          aria-label="City"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={value.area}
          onChange={(e) => onChange({ ...value, area: e.target.value })}
          disabled={!value.city}
          className="min-h-[44px] rounded-xl border border-gray-200 px-3 text-sm disabled:bg-gray-50"
          aria-label="Area"
        >
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {showPickupToggle && (
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value.pickupOnly}
            onChange={(e) => onChange({ ...value, pickupOnly: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          Stores with in-person collection only
        </label>
      )}
    </div>
  );
}
