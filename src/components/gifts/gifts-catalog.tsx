'use client';

import Link from 'next/link';
import { ChevronDown, ChevronRight, Gift, SlidersHorizontal, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GIFT_BUDGETS,
  GIFT_OCCASIONS,
  GIFT_RECIPIENTS,
  giftFilterSearchParams,
} from '@/lib/gifts/discovery';
import {
  buildOccasionSections,
  filteredFlatBoxes,
} from '@/lib/gifts/catalog-layout';
import { trackGiftFilterApplied } from '@/lib/analytics/gifts';
import GiftBoxCard from '@/components/gifts/gift-box-card';
import GiftBoxRow from '@/components/gifts/gift-box-row';
import type { GiftBox, GiftFulfilmentCentre } from '@/types/gifts';

type Props = {
  boxes: GiftBox[];
  gfc: GiftFulfilmentCentre | null;
  title?: string;
  description?: string;
  lockedOccasion?: string;
};

const SELECT_CLASS =
  'min-h-[44px] w-full appearance-none rounded-xl border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900';

export default function GiftsCatalog({
  boxes,
  title = 'Gifts',
  description,
  lockedOccasion,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftRecipient, setDraftRecipient] = useState('');
  const [draftBudget, setDraftBudget] = useState('');

  const occasion = lockedOccasion || searchParams.get('occasion') || '';
  const recipient = searchParams.get('recipient') || '';
  const budget = searchParams.get('budget') || '';

  const filters = useMemo(
    () => ({ occasion: occasion || undefined, recipient: recipient || undefined, budget: budget || undefined }),
    [occasion, recipient, budget],
  );

  const pushFilters = useCallback(
    (next: { occasion?: string; recipient?: string; budget?: string }) => {
      const nextOccasion = next.occasion !== undefined ? next.occasion : occasion;
      const nextRecipient = next.recipient !== undefined ? next.recipient : recipient;
      const nextBudget = next.budget !== undefined ? next.budget : budget;

      trackGiftFilterApplied({
        occasion: lockedOccasion || nextOccasion || undefined,
        recipient: nextRecipient || undefined,
        budget: nextBudget || undefined,
      });

      const params = giftFilterSearchParams({
        recipient: nextRecipient || undefined,
        budget: nextBudget || undefined,
      });
      if (!lockedOccasion && nextOccasion) params.set('occasion', nextOccasion);
      const q = params.toString();
      const base = lockedOccasion ? `/gifts/${lockedOccasion}` : '/gifts';
      router.push(q ? `${base}?${q}` : base, { scroll: false });
    },
    [router, occasion, recipient, budget, lockedOccasion],
  );

  const clearFilters = () => {
    const base = lockedOccasion ? `/gifts/${lockedOccasion}` : '/gifts';
    router.push(base, { scroll: false });
    setFilterOpen(false);
  };

  const openFilterSheet = () => {
    setDraftRecipient(recipient);
    setDraftBudget(budget);
    setFilterOpen(true);
  };

  const applySheetFilters = () => {
    pushFilters({ recipient: draftRecipient, budget: draftBudget });
    setFilterOpen(false);
  };

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  const defaultDescription =
    description || 'Curated gift boxes, packed and delivered to someone special.';

  const sections = useMemo(() => buildOccasionSections(boxes, filters), [boxes, filters]);
  const filtered = useMemo(() => filteredFlatBoxes(boxes, filters), [boxes, filters]);
  const useSectionLayout = !(occasion && recipient) && sections.length > 0;
  const activeFilterCount = [occasion, recipient, budget].filter(Boolean).length;
  const sheetFilterCount = [recipient, budget].filter(Boolean).length;

  const resultLabel =
    useSectionLayout && !occasion && !recipient
      ? `${boxes.length} box${boxes.length === 1 ? '' : 'es'}`
      : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`;

  return (
    <main className="min-h-screen bg-gray-50 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-24">
      {/* Desktop hero */}
      <div className="hidden border-b border-gray-200 bg-white md:block">
        <div className="container-custom py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="mt-1.5 text-base text-gray-600">{defaultDescription}</p>
            </div>
            <Link
              href="/gifts/build"
              className="shrink-0 text-sm font-semibold text-primary-700 hover:text-primary-900"
            >
              Build your own box →
            </Link>
          </div>
        </div>
      </div>

      {/* Sticky mobile header + filters / desktop filter bar */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
        {/* Mobile compact header */}
        <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3 md:hidden">
          <h1 className="truncate text-xl font-bold text-gray-900">{title}</h1>
          <Link
            href="/gifts/build"
            className="shrink-0 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Build your own
          </Link>
        </div>

        {/* Mobile: chips + filter sheet trigger */}
        <div className="space-y-2.5 px-4 pb-3 md:hidden">
          {!lockedOccasion && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 scrollbar-none">
              <OccasionChip
                active={!occasion}
                onClick={() => pushFilters({ occasion: '' })}
              >
                All
              </OccasionChip>
              {GIFT_OCCASIONS.map((o) => (
                <OccasionChip
                  key={o.slug}
                  active={occasion === o.slug}
                  onClick={() => pushFilters({ occasion: occasion === o.slug ? '' : o.slug })}
                >
                  {o.label}
                </OccasionChip>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openFilterSheet}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
              {sheetFilterCount > 0 ? (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white">
                  {sheetFilterCount}
                </span>
              ) : null}
            </button>
            <p className="flex-1 truncate text-xs text-gray-500">{resultLabel}</p>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>

          {(recipient || budget) && (
            <div className="flex flex-wrap gap-1.5">
              {recipient ? (
                <ActiveFilterTag
                  label={GIFT_RECIPIENTS.find((r) => r.slug === recipient)?.label || recipient}
                  onRemove={() => pushFilters({ recipient: '' })}
                />
              ) : null}
              {budget ? (
                <ActiveFilterTag
                  label={GIFT_BUDGETS.find((b) => b.slug === budget)?.label || budget}
                  onRemove={() => pushFilters({ budget: '' })}
                />
              ) : null}
            </div>
          )}
        </div>

        {/* Desktop dropdowns */}
        <div className="container-custom hidden py-3 md:block">
          <div className={`grid gap-2 ${lockedOccasion ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {!lockedOccasion && (
              <FilterSelect
                label="Occasion"
                value={occasion}
                onChange={(value) => pushFilters({ occasion: value })}
              >
                <option value="">All occasions</option>
                {GIFT_OCCASIONS.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.label}
                  </option>
                ))}
              </FilterSelect>
            )}

            <FilterSelect
              label="Recipient"
              value={recipient}
              onChange={(value) => pushFilters({ recipient: value })}
            >
              <option value="">Anyone</option>
              {GIFT_RECIPIENTS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Budget"
              value={budget}
              onChange={(value) => pushFilters({ budget: value })}
            >
              <option value="">Any budget</option>
              {GIFT_BUDGETS.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.label}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{resultLabel}</p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8 px-4 py-4 md:container-custom md:space-y-10 md:py-8">
        {sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 text-center">
            <Gift className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-gray-600">No gift boxes match these filters yet.</p>
            <Link href="/gifts/build" className="mt-3 inline-block text-sm font-semibold text-primary-600">
              Build your own box instead
            </Link>
          </div>
        ) : useSectionLayout ? (
          sections.map((section) => (
            <section key={section.slug} id={`gifts-${section.slug}`}>
              <div className="mb-3 flex items-start justify-between gap-2 md:mb-4">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-gray-900 md:text-xl">{section.label}</h2>
                  {section.description ? (
                    <p className="mt-0.5 hidden text-sm text-gray-600 md:block">{section.description}</p>
                  ) : null}
                </div>
                {section.slug !== 'featured' && (
                  <Link
                    href={`/gifts/${section.slug}`}
                    className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-xs font-semibold text-primary-700 md:text-sm"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </Link>
                )}
              </div>
              {section.rows.map((row) => (
                <GiftBoxRow key={`${section.slug}-${row.slug}`} label={row.label} boxes={row.boxes} />
              ))}
            </section>
          ))
        ) : (
          <div>
            <p className="mb-3 text-sm text-gray-600 md:mb-4">
              {`${GIFT_OCCASIONS.find((o) => o.slug === occasion)?.label || 'Occasion'} gifts ${GIFT_RECIPIENTS.find((r) => r.slug === recipient)?.label?.toLowerCase() || ''}`}
              {budget ? ` · ${GIFT_BUDGETS.find((b) => b.slug === budget)?.label}` : ''}
            </p>
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
              {filtered.map((box) => (
                <GiftBoxCard key={box.id} box={box} grid />
              ))}
            </div>
          </div>
        )}
      </div>

      {filterOpen && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-50 bg-black/40 md:hidden"
            onClick={() => setFilterOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-[60] animate-in slide-in-from-bottom rounded-t-2xl bg-white pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl duration-300 md:hidden">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-200" />
            <div className="max-h-[min(70dvh,520px)] overflow-y-auto px-4 pt-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">Filter gifts</h3>
                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="rounded-full p-1.5 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <FilterOptionGroup title="Recipient">
                <SheetOption active={!draftRecipient} onClick={() => setDraftRecipient('')}>
                  Anyone
                </SheetOption>
                {GIFT_RECIPIENTS.map((r) => (
                  <SheetOption
                    key={r.slug}
                    active={draftRecipient === r.slug}
                    onClick={() => setDraftRecipient(r.slug)}
                  >
                    {r.label}
                  </SheetOption>
                ))}
              </FilterOptionGroup>

              <FilterOptionGroup title="Budget">
                <SheetOption active={!draftBudget} onClick={() => setDraftBudget('')}>
                  Any budget
                </SheetOption>
                {GIFT_BUDGETS.map((b) => (
                  <SheetOption
                    key={b.slug}
                    active={draftBudget === b.slug}
                    onClick={() => setDraftBudget(b.slug)}
                  >
                    {b.label}
                  </SheetOption>
                ))}
              </FilterOptionGroup>
            </div>

            <div className="mt-2 flex gap-2 border-t border-gray-100 px-4 pt-3">
              <button
                type="button"
                onClick={() => {
                  setDraftRecipient('');
                  setDraftBudget('');
                }}
                className="min-h-[44px] flex-1 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applySheetFilters}
                className="min-h-[44px] flex-[2] rounded-xl bg-gray-900 text-sm font-semibold text-white"
              >
                Show results
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function OccasionChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-gray-100 text-gray-700 active:bg-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function ActiveFilterTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-800"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

function FilterOptionGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SheetOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-sm font-medium ${
        active ? 'bg-gray-900 text-white' : 'text-gray-800 active:bg-gray-100'
      }`}
    >
      {children}
      {active ? <span className="text-xs opacity-80">Selected</span> : null}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-medium text-gray-500">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={SELECT_CLASS}
          aria-label={label}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>
    </label>
  );
}
