'use client';

import { useCallback, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import Link from 'next/link';
import { ArrowLeft, ArrowUpDown, Check, ChevronDown, ChevronRight, MapPin, Navigation, Store } from 'lucide-react';
import { toast } from 'sonner';
import Sheet from '@/components/mobile/primitives/sheet';
import { haptic } from '@/lib/mobile/haptics';
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
  // Mobile tier (docs/mobile-tier-plan.md, wave 3): top bar replaces the back link and heading below md.
  const tier = useMobileTier() !== null;
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
  // Mobile tier: area and sort live in bottom sheets behind a chip row.
  const [areaSheetOpen, setAreaSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const areaLabel = filters.area || filters.city || filters.state || 'Area';
  const sortOptions: { value: 'name' | 'distance' | 'quality'; label: string }[] = [
    { value: 'name', label: 'Name' },
    { value: 'quality', label: 'Best rated sellers' },
    ...(coords ? [{ value: 'distance' as const, label: 'Nearest' }] : []),
  ];

  const locateMe = async () => {
    setLocating(true);
    try {
      const { requestCurrentPosition } = await import('@/lib/local/geolocation');
      const next = await requestCurrentPosition();
      setCoords(next);
      setFilters((current) => ({ ...current, state: '', city: '', area: '' }));
      setSort('distance');
      haptic('success');
    } catch {
      toast.error('Could not get your location. Pick your area instead.');
    } finally {
      setLocating(false);
    }
  };

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
    <main className={clsx('min-h-screen bg-gray-50 pb-24 md:pb-8', tier && 'max-md:pb-4')}>
      {tier && (
        <div className="sticky top-0 z-m-header md:hidden">
          <MobileTopBar title="Local stores" subtitle="Trusted businesses near you" backHref="/" />
        </div>
      )}
      <div className={clsx('container mx-auto max-w-6xl px-4 py-6', tier && 'max-md:pt-2')}>
        <Link
          href="/"
          className={clsx('group mb-6 inline-flex items-center gap-2 font-medium text-primary-600 hover:text-primary-700', tier && 'max-md:hidden')}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        <div className="mb-6">
          <div className={clsx('mb-2 flex items-center gap-3', tier && 'max-md:hidden')}>
            <div className="rounded-lg bg-primary-600 p-2">
              <Store className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Local stores near you</h1>
          </div>
          <p className={clsx('text-sm text-gray-500', tier && 'max-md:hidden')}>
            Discover trusted Nigerian businesses — filter by area or use your location.
          </p>
        </div>

        {tier && (
          <div className="-mx-4 -mt-6 mb-2 md:hidden">
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
              <DirectoryChip selected={Boolean(coords)} disabled={locating} onClick={() => (coords ? (setCoords(null), setSort('name')) : void locateMe())}>
                <Navigation className="h-4 w-4" aria-hidden />
                {locating ? 'Locating…' : 'Near me'}
              </DirectoryChip>
              <DirectoryChip selected={Boolean(filters.state)} onClick={() => setAreaSheetOpen(true)}>
                <MapPin className="h-4 w-4" aria-hidden />
                <span className="max-w-[9rem] truncate">{areaLabel}</span>
                <ChevronDown className="h-4 w-4" aria-hidden />
              </DirectoryChip>
              <DirectoryChip
                selected={filters.pickupOnly}
                onClick={() => {
                  haptic('selection');
                  setFilters((current) => ({ ...current, pickupOnly: !current.pickupOnly }));
                }}
              >
                {filters.pickupOnly && <Check className="h-4 w-4" aria-hidden />}
                Collect in store
              </DirectoryChip>
              <DirectoryChip onClick={() => setSortSheetOpen(true)}>
                <ArrowUpDown className="h-4 w-4" aria-hidden />
                {sortOptions.find((option) => option.value === sort)?.label ?? 'Sort'}
              </DirectoryChip>
            </div>
          </div>
        )}

        <div className={clsx(tier && 'max-md:hidden')}>
        <AreaFilterBar
          value={filters}
          onChange={(next) => {
            setFilters(next);
            if (next.state || next.city) setCoords(null);
          }}
          onUseLocation={setCoords}
          className="mb-6"
        />
        </div>

        <div className={clsx('mb-4 flex justify-end', tier && 'max-md:hidden')}>
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
          <>
          {tier && (
            <div className="md:hidden">
              <p className="px-1 pb-2 text-m-body-s text-m-on-surface-variant">
                {vendors.length} {vendors.length === 1 ? 'store' : 'stores'}
              </p>
              <div className="overflow-hidden rounded-2xl bg-m-surface-lowest shadow-[0_0_0_1px_rgb(30_26_31/0.07)]">
                {vendors.map((v, index) => {
                  const color = colorFor(v.store_name || '');
                  const location = [v.area, v.city].filter(Boolean).join(', ') || [v.city, v.state].filter(Boolean).join(', ');
                  return (
                    <Link
                      key={v.id}
                      href={`/vendor/${encodeURIComponent(v.vendor_id)}`}
                      className={clsx('flex min-h-[72px] items-center gap-3 px-4 py-3 active:bg-black/5', index > 0 && 'border-t border-m-outline-variant')}
                    >
                      {v.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.logo_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-m-outline-variant" />
                      ) : (
                        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-semibold ${color.bg} ${color.text}`}>
                          {initials(v.store_name || '?')}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium leading-5 text-m-on-surface">{v.store_name}</span>
                        <span className="block truncate text-m-body-s text-m-on-surface-variant">
                          {[location, v.distance_km != null ? `${v.distance_km} km away` : ''].filter(Boolean).join(' · ') || 'Nigeria'}
                        </span>
                        {v.supports_pickup && (
                          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            Collect in store
                          </span>
                        )}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-m-on-surface-variant" aria-hidden />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <div className={clsx('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:gap-4', tier && 'max-md:hidden')}>
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
          </>
        )}
      </div>

      {tier && (
        <>
          <Sheet
            open={areaSheetOpen}
            onClose={() => setAreaSheetOpen(false)}
            title="Area"
            headerAction={
              <button
                type="button"
                onClick={() => setFilters((current) => ({ ...current, state: '', city: '', area: '' }))}
                className="h-10 rounded-full px-3 text-m-label-l text-m-primary"
              >
                Clear
              </button>
            }
            footer={
              <button
                type="button"
                onClick={() => setAreaSheetOpen(false)}
                className="h-12 w-full rounded-full bg-m-primary text-m-label-l text-m-on-primary"
              >
                {loading ? 'Loading stores…' : `Show ${vendors.length} ${vendors.length === 1 ? 'store' : 'stores'}`}
              </button>
            }
          >
            <AreaFilterBar
              value={filters}
              onChange={(next) => {
                setFilters(next);
                if (next.state || next.city) setCoords(null);
              }}
              onUseLocation={(next) => {
                setCoords(next);
                setSort('distance');
              }}
              showPickupToggle={false}
            />
          </Sheet>
          <Sheet open={sortSheetOpen} onClose={() => setSortSheetOpen(false)} title="Sort stores">
            <div role="radiogroup" aria-label="Sort stores" className="-mx-6">
              {sortOptions.map((option) => {
                const selected = option.value === sort;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      haptic('selection');
                      setSort(option.value);
                      setSortSheetOpen(false);
                    }}
                    className="flex min-h-14 w-full items-center gap-4 px-6 text-left text-m-body-l text-m-on-surface active:bg-black/5"
                  >
                    <span
                      aria-hidden
                      className={clsx(
                        'relative h-5 w-5 shrink-0 rounded-full',
                        selected ? 'shadow-[inset_0_0_0_2px_var(--m-primary)]' : 'shadow-[inset_0_0_0_2px_var(--m-on-surface-variant)]',
                      )}
                    >
                      {selected && <span className="absolute inset-[5px] rounded-full bg-m-primary" />}
                    </span>
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Sheet>
        </>
      )}
    </main>
  );
}

function DirectoryChip({
  selected = false,
  disabled = false,
  onClick,
  children,
}: {
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] disabled:opacity-60",
        selected
          ? 'bg-m-primary-container text-m-on-primary-container'
          : 'bg-m-surface text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline-variant)]',
      )}
    >
      {children}
    </button>
  );
}
