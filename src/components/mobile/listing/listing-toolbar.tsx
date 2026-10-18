'use client';

import { useState } from 'react';
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { clsx } from 'clsx';
import Sheet from '@/components/mobile/primitives/sheet';
import { haptic } from '@/lib/mobile/haptics';
import {
  EMPTY_LISTING_FILTERS,
  PRICE_PRESETS,
  countActiveFilters,
  matchesPreset,
  type ListingFilters,
} from '@/lib/mobile/listing-filters';

export type SortOption<T extends string> = { value: T; label: string };

type ListingToolbarProps<T extends string> = {
  sort: T;
  sortOptions: SortOption<T>[];
  onSortChange: (value: T) => void;
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
  /** Sellers to offer in the filter sheet (from the loaded products). */
  sellers: string[];
  /** Live count for the "Show n results" button, given draft filters. */
  countFor: (filters: ListingFilters) => number;
};

const QUICK_PRICE = PRICE_PRESETS[1]; // Under ₦20,000

/**
 * Mobile listing chips: sort, filters, and two quick toggles. Sticky under the
 * top bar. Sort and filters open bottom sheets; Back closes them.
 */
export default function ListingToolbar<T extends string>({
  sort,
  sortOptions,
  onSortChange,
  filters,
  onFiltersChange,
  sellers,
  countFor,
}: ListingToolbarProps<T>) {
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeCount = countActiveFilters(filters);
  const sortLabel = sortOptions.find((option) => option.value === sort)?.label ?? 'Sort';
  const quickPriceOn = matchesPreset(filters, QUICK_PRICE);

  return (
    <>
      <div className="sticky top-16 z-[29] -mx-4 bg-m-surface pb-3 pt-1 md:hidden">
        <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
          <Chip onClick={() => setSortOpen(true)} icon={<ArrowUpDown className="h-[18px] w-[18px]" aria-hidden />}>
            {sortLabel}
            <ChevronDown className="h-[18px] w-[18px]" aria-hidden />
          </Chip>
          <Chip
            selected={activeCount > 0}
            onClick={() => setFiltersOpen(true)}
            icon={<SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />}
          >
            {activeCount > 0 ? `Filters · ${activeCount}` : 'Filters'}
          </Chip>
          <Chip
            selected={filters.inStockOnly}
            onClick={() => {
              haptic('selection');
              onFiltersChange({ ...filters, inStockOnly: !filters.inStockOnly });
            }}
          >
            In stock
          </Chip>
          <Chip
            selected={quickPriceOn}
            onClick={() => {
              haptic('selection');
              onFiltersChange(
                quickPriceOn
                  ? { ...filters, minPrice: null, maxPrice: null }
                  : { ...filters, minPrice: QUICK_PRICE.min, maxPrice: QUICK_PRICE.max },
              );
            }}
          >
            {QUICK_PRICE.label}
          </Chip>
        </div>
      </div>

      <Sheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort by">
        <div role="radiogroup" aria-label="Sort by" className="-mx-6">
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
                  onSortChange(option.value);
                  setSortOpen(false);
                }}
                className="flex min-h-14 w-full items-center gap-4 px-6 text-left text-m-body-l text-m-on-surface active:bg-black/5"
              >
                <span
                  aria-hidden
                  className={clsx(
                    'relative h-5 w-5 shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--m-on-surface-variant)]',
                    selected && 'shadow-[inset_0_0_0_2px_var(--m-primary)]',
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

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        sellers={sellers}
        countFor={countFor}
        onApply={(next) => {
          onFiltersChange(next);
          setFiltersOpen(false);
        }}
      />
    </>
  );
}

function Chip({
  selected = false,
  onClick,
  icon,
  children,
}: {
  selected?: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        // 32px chip, 48px tap area via the ::before extension.
        "relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
        selected
          ? 'bg-m-primary-container text-m-on-primary-container'
          : 'bg-m-surface text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline-variant)]',
      )}
    >
      {selected && !icon ? <Check className="h-[18px] w-[18px]" aria-hidden /> : icon}
      {children}
    </button>
  );
}

function FilterSheet({
  open,
  onClose,
  filters,
  sellers,
  countFor,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  filters: ListingFilters;
  sellers: string[];
  countFor: (filters: ListingFilters) => number;
  onApply: (filters: ListingFilters) => void;
}) {
  // Draft edits; nothing changes on the page until "Show results".
  const [draft, setDraft] = useState(filters);
  const [syncedFrom, setSyncedFrom] = useState(filters);
  if (open && syncedFrom !== filters) {
    setSyncedFrom(filters);
    setDraft(filters);
  }
  const resultCount = countFor(draft);

  const setPrice = (value: string, key: 'minPrice' | 'maxPrice') => {
    const digits = value.replace(/[^\d]/g, '');
    setDraft((current) => ({ ...current, [key]: digits ? Number(digits) : null }));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filters"
      headerAction={
        <button
          type="button"
          onClick={() => setDraft(EMPTY_LISTING_FILTERS)}
          className="h-10 rounded-full px-3 text-m-label-l text-m-primary active:bg-m-primary-container"
        >
          Clear all
        </button>
      }
      footer={
        <button
          type="button"
          onClick={() => {
            haptic('tap');
            onApply(draft);
          }}
          className="h-12 w-full rounded-full bg-m-primary text-m-label-l text-m-on-primary"
        >
          {resultCount === 0 ? 'No matching products' : `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`}
        </button>
      }
    >
      <h3 className="mb-2.5 mt-1 text-m-title-s text-m-on-surface">Price</h3>
      <div className="grid grid-cols-2 gap-3">
        <PriceField label="Min" value={draft.minPrice} onChange={(value) => setPrice(value, 'minPrice')} />
        <PriceField label="Max" value={draft.maxPrice} onChange={(value) => setPrice(value, 'maxPrice')} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRICE_PRESETS.map((preset) => {
          const selected = matchesPreset(draft, preset);
          return (
            <Chip
              key={preset.label}
              selected={selected}
              onClick={() =>
                setDraft((current) =>
                  selected
                    ? { ...current, minPrice: null, maxPrice: null }
                    : { ...current, minPrice: preset.min, maxPrice: preset.max },
                )
              }
            >
              {preset.label}
            </Chip>
          );
        })}
      </div>

      <label className="mt-3 flex min-h-14 items-center justify-between gap-4">
        <span className="text-m-title-s text-m-on-surface">In stock only</span>
        <input
          type="checkbox"
          role="switch"
          checked={draft.inStockOnly}
          onChange={(event) => setDraft((current) => ({ ...current, inStockOnly: event.target.checked }))}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={clsx(
            'relative h-8 w-[52px] shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-m-primary',
            draft.inStockOnly ? 'bg-m-primary' : 'bg-m-surface-high shadow-[inset_0_0_0_2px_var(--m-outline)]',
          )}
        >
          <span
            className={clsx(
              'absolute left-1 top-1 h-6 w-6 rounded-full transition-transform duration-200 ease-m-standard',
              draft.inStockOnly ? 'translate-x-5 bg-white' : 'bg-m-outline',
            )}
          />
        </span>
      </label>

      {sellers.length > 1 && (
        <>
          <h3 className="mb-1 mt-2 text-m-title-s text-m-on-surface">Sold by</h3>
          {sellers.slice(0, 8).map((seller) => {
            const checked = draft.sellers.includes(seller);
            return (
              <label key={seller} className="flex min-h-12 items-center gap-4">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setDraft((current) => ({
                      ...current,
                      sellers: checked ? current.sellers.filter((name) => name !== seller) : [...current.sellers, seller],
                    }))
                  }
                  className="h-[18px] w-[18px] shrink-0 accent-[var(--m-primary)]"
                />
                <span className="text-m-body-l text-m-on-surface">{seller}</span>
              </label>
            );
          })}
        </>
      )}
    </Sheet>
  );
}

function PriceField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: string) => void }) {
  return (
    <label className="relative flex h-14 items-center rounded-lg bg-m-surface-low px-4 shadow-[inset_0_0_0_1px_var(--m-outline)] focus-within:shadow-[inset_0_0_0_2px_var(--m-primary)]">
      <span className="absolute -top-2 left-3 bg-m-surface-low px-1 text-m-body-s text-m-on-surface-variant">{label}</span>
      <span className="mr-1 text-m-body-l text-m-on-surface-variant">₦</span>
      <input
        inputMode="numeric"
        value={value === null ? '' : value.toLocaleString()}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        className="w-full min-w-0 bg-transparent text-m-body-l text-m-on-surface outline-none placeholder:text-m-outline"
      />
    </label>
  );
}
