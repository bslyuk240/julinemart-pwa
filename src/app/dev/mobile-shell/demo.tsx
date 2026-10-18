'use client';

import { useState } from 'react';
import { Search, Share2, Heart, ShoppingCart, SlidersHorizontal, Trash2, Link2 } from 'lucide-react';
import MobileTopBar, { TopBarAction } from '@/components/mobile/shell/mobile-top-bar';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import Sheet from '@/components/mobile/primitives/sheet';
import ActionSheet from '@/components/mobile/primitives/action-sheet';
import { haptic } from '@/lib/mobile/haptics';

export default function MobileShellDemo() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [inStock, setInStock] = useState(true);

  return (
    <div className="min-h-screen bg-m-surface text-m-on-surface">
      <MobileTopBar
        title="Mobile shell demo"
        backHref="/"
        actions={
          <>
            <TopBarAction label="Search">
              <Search className="h-6 w-6" aria-hidden />
            </TopBarAction>
            <TopBarAction label="Share" onClick={() => setActionsOpen(true)}>
              <Share2 className="h-5 w-5" aria-hidden />
            </TopBarAction>
          </>
        }
      />

      <div className="hidden p-8 md:block">
        <p className="text-gray-600">The mobile shell only appears below 768px. Resize to a phone width.</p>
      </div>

      <div className="space-y-4 p-4 md:hidden">
        <p className="text-m-body-m text-m-on-surface-variant">
          Primitives for the mobile tier. Scroll to see the top bar turn solid. On Android, Back closes an open sheet first.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-m-primary-container px-3 text-[13px] font-semibold text-m-on-primary-container"
          >
            <SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />
            Filters · 1
          </button>
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline-variant)]"
          >
            Action sheet
          </button>
        </div>

        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="rounded-m-card bg-m-surface-lowest p-4 shadow-[0_0_0_1px_rgb(30_26_31/0.07)]">
            <p className="text-m-title-s">Row {i + 1}</p>
            <p className="text-m-body-m text-m-on-surface-variant">Filler content so the page scrolls.</p>
          </div>
        ))}
      </div>

      <StickyActionBar aboveTabBar>
        <button
          type="button"
          aria-label="Save to wishlist"
          onClick={() => haptic('selection')}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline)]"
        >
          <Heart className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => haptic('success')}
          className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-m-primary text-m-label-l text-m-on-primary"
        >
          <ShoppingCart className="h-[18px] w-[18px]" aria-hidden />
          Add to cart
        </button>
        <button
          type="button"
          onClick={() => haptic('tap')}
          className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-m-tertiary text-m-label-l text-m-on-tertiary"
        >
          Buy now
        </button>
      </StickyActionBar>

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        headerAction={
          <button type="button" className="h-10 px-3 text-m-label-l text-m-primary" onClick={() => setInStock(false)}>
            Clear all
          </button>
        }
        footer={
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="h-12 w-full rounded-full bg-m-primary text-m-label-l text-m-on-primary"
          >
            Show results
          </button>
        }
      >
        <h3 className="mb-2.5 mt-1 text-m-title-s">Price</h3>
        <div className="flex flex-wrap gap-2">
          {['Under ₦10,000', 'Under ₦20,000', '₦20,000 – ₦50,000', 'Over ₦50,000'].map((label) => (
            <span
              key={label}
              className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold text-m-on-surface-variant shadow-[inset_0_0_0_1px_var(--m-outline-variant)]"
            >
              {label}
            </span>
          ))}
        </div>
        <label className="mt-3 flex min-h-14 items-center justify-between">
          <span className="text-m-title-s">In stock only</span>
          <input
            type="checkbox"
            checked={inStock}
            onChange={(event) => {
              setInStock(event.target.checked);
              haptic('selection');
            }}
            className="h-5 w-5 accent-[var(--m-primary)]"
          />
        </label>
        <p className="mt-2 text-m-body-m text-m-on-surface-variant">Swipe the handle down, tap outside, press Escape or Back to close.</p>
      </Sheet>

      <ActionSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        actions={[
          { label: 'Share link', icon: <Share2 className="h-5 w-5" aria-hidden />, onSelect: () => {} },
          { label: 'Copy link', icon: <Link2 className="h-5 w-5" aria-hidden />, onSelect: () => {} },
          { label: 'Remove from cart', icon: <Trash2 className="h-5 w-5" aria-hidden />, destructive: true, onSelect: () => {} },
        ]}
      />
    </div>
  );
}
