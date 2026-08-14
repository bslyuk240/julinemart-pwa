'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';
import AreaFilterBar, { type AreaFilters } from '@/components/local/AreaFilterBar';

type DiscoverVendor = {
  id: string;
  store_name: string;
  logo_url?: string | null;
  description?: string | null;
  vendor_id: string;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  supports_pickup?: boolean;
  distance_km?: number | null;
  seller_quality_score?: number | null;
};

const AVATAR_COLORS = [
  { bg: 'bg-purple-100', text: 'text-purple-800' },
  { bg: 'bg-teal-100', text: 'text-teal-800' },
  { bg: 'bg-orange-100', text: 'text-orange-800' },
  { bg: 'bg-blue-100', text: 'text-blue-800' },
];

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function colorFor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function VendorsDirectory() {
  const [filters, setFilters] = useState<AreaFilters>({
    state: '',
    city: '',
    area: '',
    pickupOnly: false,
  });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sort, setSort] = useState<'name' | 'distance' | 'quality'>('name');
  const [vendors, setVendors] = useState<DiscoverVendor[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filters.state) qs.set('state', filters.state);
      if (filters.city) qs.set('city', filters.city);
      if (filters.area) qs.set('area', filters.area);
      if (filters.pickupOnly) qs.set('pickup_only', 'true');
      if (coords) {
        qs.set('lat', String(coords.latitude));
        qs.set('lng', String(coords.longitude));
      }
      if (sort === 'quality') qs.set('sort', 'quality');
      else if (sort === 'distance' && coords) qs.set('sort', 'distance');
      qs.set('per_page', '100');

      const res = await fetch(`/api/vendors/discover?${qs}`);
      const json = await res.json();
      setVendors(json.vendors || []);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [filters, coords, sort]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        <Link
          href="/"
          className="group mb-6 inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="rounded-lg bg-primary-600 p-2">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Local stores near you</h1>
          </div>
          <p className="text-sm text-gray-500">
            Discover trusted Nigerian businesses — filter by area or use your location.
          </p>
        </div>

        <AreaFilterBar
          value={filters}
          onChange={(next) => {
            setFilters(next);
            if (next.state || next.city) setCoords(null);
          }}
          onUseLocation={setCoords}
          className="mb-6"
        />

        <div className="mb-4 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'name' | 'distance' | 'quality')}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm"
            >
              <option value="name">Name</option>
              <option value="quality">Best rated sellers</option>
              {coords && <option value="distance">Nearest</option>}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading stores…</div>
        ) : vendors.length === 0 ? (
          <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center">
            <Store className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-gray-500">No stores match this area yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4">
            {vendors.map((v) => {
              const color = colorFor(v.store_name || '');
              const abbr = initials(v.store_name || '?');
              const location = [v.area, v.city].filter(Boolean).join(', ') || [v.city, v.state].filter(Boolean).join(', ');

              return (
                <Link
                  key={v.id}
                  href={`/vendor/${encodeURIComponent(v.vendor_id)}`}
                  className="group flex flex-col items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 transition-all hover:border-primary-200 hover:shadow-sm"
                >
                  {v.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.logo_url} alt="" className="h-11 w-11 rounded-full border border-gray-100 object-cover" />
                  ) : (
                    <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${color.bg} ${color.text}`}>
                      {abbr}
                    </div>
                  )}
                  <div className="min-w-0 w-full">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900 transition-colors group-hover:text-primary-600">
                      {v.store_name}
                    </p>
                    {location && <p className="mt-0.5 truncate text-xs text-gray-400">{location}</p>}
                    {v.distance_km != null && (
                      <p className="mt-0.5 text-[10px] font-medium text-primary-600">{v.distance_km} km away</p>
                    )}
                    {v.supports_pickup && (
                      <span className="mt-1 inline-block rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Collect in store
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
