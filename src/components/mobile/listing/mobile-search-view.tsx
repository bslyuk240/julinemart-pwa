'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History, Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import type { Product } from '@/types/product';
import { decodeHtmlEntities } from '@/lib/utils/helpers';
import { filterActiveVendorProducts } from '@/lib/utils/vendor-filters';
import { hasInAppHistory } from '@/lib/mobile/nav-history';
import {
  clearRecentSearches,
  getRecentSearchesServerSnapshot,
  getRecentSearchesSnapshot,
  publishRecentSearches,
  saveRecentSearch,
  subscribeRecentSearches,
} from '@/lib/mobile/recent-searches';
import { productPrice } from '@/lib/mobile/listing-filters';

type MobileSearchViewProps = {
  /** The submitted query (from `?q=`). */
  query: string;
  /** Results for the submitted query; hidden on mobile while the shopper is typing. */
  children: ReactNode;
};

const isRemote = (src: string) => /^https?:\/\//i.test(src);

/**
 * Mobile tier full-screen search (M2): its own search field, live product
 * matches while typing, and recent searches. md and up are untouched; the
 * children (results) render as before there.
 */
export default function MobileSearchView({ query, children }: MobileSearchViewProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState(query);
  const [editing, setEditing] = useState(!query);
  const [matches, setMatches] = useState<Product[]>([]);
  const recent = useSyncExternalStore(
    subscribeRecentSearches,
    getRecentSearchesSnapshot,
    getRecentSearchesServerSnapshot,
  );

  // Keep the field in step with the URL (e.g. a recent-search tap or Back).
  const [syncedQuery, setSyncedQuery] = useState(query);
  if (syncedQuery !== query) {
    setSyncedQuery(query);
    setTerm(query);
    setEditing(!query);
  }

  useEffect(() => {
    if (!query && window.matchMedia('(max-width: 767px)').matches) inputRef.current?.focus();
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmed = term.trim();
  useEffect(() => {
    if (!editing || trimmed.length < 2) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ search: trimmed, per_page: '6' });
        const res = await fetch(`/api/products?${qs.toString()}`, { signal: controller.signal });
        if (!res.ok) return;
        const { products } = await res.json();
        setMatches(await filterActiveVendorProducts(products ?? []));
      } catch {
        /* aborted or offline: keep the last matches */
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [trimmed, editing]);

  const submit = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    publishRecentSearches(saveRecentSearch(clean));
    setEditing(false);
    inputRef.current?.blur();
    router.replace(`/search?q=${encodeURIComponent(clean)}`);
  };

  const goBack = () => {
    if (editing && query) {
      setTerm(query);
      setEditing(false);
      inputRef.current?.blur();
      return;
    }
    if (hasInAppHistory()) router.back();
    else router.push('/');
  };

  const visibleMatches = trimmed.length >= 2 ? matches : [];

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(term);
        }}
        className="sticky top-0 z-m-header -mx-4 flex h-16 items-center gap-1 bg-m-surface-lowest px-1 shadow-[0_1px_0_var(--m-outline-variant)] md:hidden"
      >
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-m-on-surface-variant active:bg-black/10"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden />
        </button>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setEditing(true);
          }}
          onFocus={() => setEditing(true)}
          placeholder="Search JulineMart"
          aria-label="Search products"
          className="h-12 min-w-0 flex-1 bg-transparent text-m-body-l text-m-on-surface caret-m-primary outline-none placeholder:text-m-on-surface-variant [&::-webkit-search-cancel-button]:hidden"
        />
        {term && (
          <button
            type="button"
            onClick={() => {
              setTerm('');
              setEditing(true);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-m-on-surface-variant active:bg-black/10"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        )}
      </form>

      {editing && (
        <div className="-mx-4 bg-m-surface-lowest pb-6 md:hidden">
          {trimmed && (
            <button
              type="button"
              onClick={() => submit(term)}
              className="flex min-h-14 w-full items-center gap-4 px-4 text-left active:bg-black/5"
            >
              <Search className="h-5 w-5 shrink-0 text-m-on-surface-variant" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-m-body-l text-m-on-surface">
                Search for &ldquo;<b className="font-semibold">{trimmed}</b>&rdquo;
              </span>
            </button>
          )}

          {visibleMatches.length > 0 && (
            <>
              <div className="h-2 bg-m-surface-low" />
              <p className="px-4 pb-1 pt-4 text-m-title-s text-m-on-surface">Products</p>
              {visibleMatches.slice(0, 5).map((product) => {
                const src = product.images?.[0]?.src || '/images/placeholder.svg';
                return (
                  <Link
                    key={product.supabaseId ?? product.slug ?? product.id}
                    href={`/product/${product.slug}`}
                    onClick={() => publishRecentSearches(saveRecentSearch(trimmed))}
                    className="flex min-h-20 items-center gap-4 px-4 py-2 active:bg-black/5"
                  >
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white shadow-[inset_0_0_0_1px_var(--m-outline-variant)]">
                      <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" unoptimized={isRemote(src)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-[15px] font-medium leading-5 text-m-on-surface">
                        {decodeHtmlEntities(product.name)}
                      </span>
                      <span className="text-m-title-s tabular-nums text-m-on-surface">
                        ₦{productPrice(product).toLocaleString()}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </>
          )}

          {recent.length > 0 && (
            <>
              <div className="h-2 bg-m-surface-low" />
              <div className="flex items-center justify-between pl-4 pr-1 pt-2">
                <p className="text-m-title-s text-m-on-surface">Recent searches</p>
                <button
                  type="button"
                  onClick={() => {
                    clearRecentSearches();
                    publishRecentSearches([]);
                  }}
                  className="h-10 rounded-full px-3 text-m-label-l text-m-primary"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2 px-4 pt-1">
                {recent.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => submit(item)}
                    className="relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline-variant)] before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
                  >
                    <History className="h-4 w-4" aria-hidden />
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}

          {!trimmed && recent.length === 0 && (
            <p className="px-4 pt-6 text-m-body-m text-m-on-surface-variant">
              Search by product name, brand or category.
            </p>
          )}
        </div>
      )}

      <div className={clsx(editing && 'max-md:hidden')}>{children}</div>
    </>
  );
}
