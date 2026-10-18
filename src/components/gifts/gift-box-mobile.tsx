'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, Link2, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar, { TopBarAction } from '@/components/mobile/shell/mobile-top-bar';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import ActionSheet from '@/components/mobile/primitives/action-sheet';
import { useGiftBoxFavorites } from '@/hooks/use-gift-box-favorites';
import { haptic } from '@/lib/mobile/haptics';
import { formatPrice } from '@/lib/utils/format-price';
import type { GiftBox } from '@/types/gifts';

// Mobile tier gift box page (docs/mobile-tier-plan.md, wave 2): a top bar with
// share + save, and a pinned "Send this gift" bar. Both render only on
// mobile-tier routes and only below md.

export function GiftBoxMobileTopBar({ box }: { box: GiftBox }) {
  const tier = useMobileTier() !== null;
  const [shareOpen, setShareOpen] = useState(false);
  if (!tier) return null;

  const url = () => window.location.href;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url());
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link — please copy it from your address bar.');
    }
  };

  return (
    <>
      <MobileTopBar
        title={box.name}
        backHref="/gifts"
        actions={
          <TopBarAction label="Share" onClick={() => setShareOpen(true)}>
            <Share2 className="h-5 w-5" aria-hidden />
          </TopBarAction>
        }
      />
      <ActionSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this gift"
        actions={[
          ...(typeof navigator !== 'undefined' && 'share' in navigator
            ? [
                {
                  label: 'Share via…',
                  icon: <Share2 className="h-5 w-5" aria-hidden />,
                  onSelect: () => void navigator.share({ title: box.name, url: url() }).catch(() => {}),
                },
              ]
            : []),
          {
            label: 'WhatsApp',
            icon: <Share2 className="h-5 w-5" aria-hidden />,
            onSelect: () =>
              window.open(
                `https://wa.me/?text=${encodeURIComponent(`Check out this gift box: ${box.name} - ${formatPrice(box.list_price)}\n${url()}`)}`,
                '_blank',
              ),
          },
          { label: 'Copy link', icon: <Link2 className="h-5 w-5" aria-hidden />, onSelect: () => void copyLink() },
        ]}
      />
    </>
  );
}

export function GiftBoxMobileBar({ box }: { box: GiftBox }) {
  const tier = useMobileTier() !== null;
  const { isFavorite, toggleFavorite } = useGiftBoxFavorites();
  if (!tier) return null;
  const saved = isFavorite(box.id);

  return (
    <StickyActionBar>
      <button
        type="button"
        onClick={() => {
          haptic(saved ? 'tap' : 'success');
          toggleFavorite(box);
        }}
        aria-label={saved ? 'Remove from saved gifts' : 'Save this gift'}
        aria-pressed={saved}
        className={clsx(
          'grid h-12 w-12 shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_var(--m-outline)]',
          saved ? 'text-m-primary' : 'text-m-on-surface-variant',
        )}
      >
        <Heart className={clsx('h-5 w-5', saved && 'fill-current')} aria-hidden />
      </button>
      <Link
        href={`/gifts/checkout?box=${encodeURIComponent(box.slug)}`}
        onClick={() => haptic('tap')}
        className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-m-primary px-5 text-m-label-l text-m-on-primary shadow-[0_1px_2px_rgb(60_4_69/0.3)] active:opacity-90"
      >
        <span className="truncate">Send this gift</span>
        <span aria-hidden>·</span>
        <span className="tabular-nums">{formatPrice(box.list_price)}</span>
      </Link>
    </StickyActionBar>
  );
}
