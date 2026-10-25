'use client';

import Link from 'next/link';
import { ChevronRight, MessageCircle, RotateCcw, Search, Sparkles, Store, Truck } from 'lucide-react';
import MobileSectionHeader from '@/components/home/mobile-section-header';
import { useFreeShipping } from '@/hooks/use-free-shipping';
import type { HomeBanner } from '@/lib/home/pwa-settings';

// Phone-only (md:hidden) pieces of the homepage. On phones the site header and
// footer are hidden (mobile tier), so these take over their jobs on Home.

const LOGO_SRC = process.env.NEXT_PUBLIC_LOGO_URL?.trim() || '/images/logo.png';

/** Root top bar: logo and a search field that opens the full-screen search. */
export function HomeTopBar() {
  return (
    <header className="sticky top-0 z-m-header flex h-16 items-center gap-2 bg-m-surface pl-3 pr-4 md:hidden">
      <h1 className="sr-only">JulineMart</h1>
      <Link href="/" aria-label="JulineMart home" className="grid h-12 w-12 flex-none place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_SRC} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-contain" />
      </Link>
      <Link
        href="/search"
        className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full bg-m-surface-container px-4 text-m-body-l text-m-on-surface-variant"
      >
        <Search className="h-5 w-5 shrink-0" aria-hidden />
        <span className="truncate">Search JulineMart</span>
      </Link>
    </header>
  );
}

/**
 * The announcement bar (purple strip above the desktop header), as a tonal row
 * under the hero. Without admin text it advertises the live free-shipping offer.
 */
export function HomePromoStrip({ banner }: { banner: HomeBanner }) {
  const { threshold, loading } = useFreeShipping();
  if (!banner.enabled) return null;

  const text =
    banner.text ||
    (loading || threshold === null
      ? ''
      : threshold > 0
        ? `Free delivery on orders over ₦${threshold.toLocaleString()}`
        : 'Free delivery on every order');
  if (!text) return null;

  const Icon = /ship|deliver/i.test(text) ? Truck : Sparkles;
  const body = (
    <>
      <Icon className="h-5 w-5 flex-none" aria-hidden />
      <span className="min-w-0 flex-1 py-2.5">{text}</span>
      {banner.link && <ChevronRight className="h-[18px] w-[18px] flex-none" aria-hidden />}
    </>
  );
  const className =
    'mx-4 mt-4 flex min-h-12 items-center gap-3 rounded-m-card bg-m-primary-container pl-4 pr-3 text-m-body-m text-m-on-primary-container md:hidden';

  if (!banner.link) return <p className={className}>{body}</p>;
  if (banner.link.startsWith('/')) {
    return (
      <Link href={banner.link} className={className}>
        {body}
      </Link>
    );
  }
  return (
    <a href={banner.link} target="_blank" rel="noopener noreferrer" className={className}>
      {body}
    </a>
  );
}

const HELP_ROWS = [
  { href: '/contact', icon: MessageCircle, title: 'Help & contact', text: 'WhatsApp, call or email support', tone: true },
  { href: '/page/refund_returns', icon: RotateCcw, title: 'Returns & refunds', text: 'Refunds within 7 days of approval' },
  { href: '/page/become-a-vendor', icon: Store, title: 'Sell on JulineMart', text: 'Open a store and reach shoppers nationwide' },
];

/** Replaces the desktop footer at the bottom of the phone homepage. */
export function HomeHelpLinks() {
  return (
    <section className="mt-6 border-t-8 border-m-surface-low pt-3 md:hidden" aria-labelledby="home-help-title">
      <MobileSectionHeader id="home-help-title" title="Help" />
      <ul>
        {HELP_ROWS.map((row) => (
          <li key={row.href}>
            <Link href={row.href} className="flex min-h-[72px] items-center gap-4 px-4 py-2 active:bg-m-on-surface/10">
              <span
                className={
                  row.tone
                    ? 'grid h-10 w-10 flex-none place-items-center rounded-full bg-m-primary-container text-m-primary'
                    : 'grid h-10 w-10 flex-none place-items-center rounded-full bg-m-surface-container text-m-on-surface-variant'
                }
              >
                <row.icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-m-body-l text-m-on-surface">{row.title}</span>
                <span className="line-clamp-2 block text-m-body-m text-m-on-surface-variant">{row.text}</span>
              </span>
              <ChevronRight className="h-5 w-5 flex-none text-m-on-surface-variant" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
      <p className="px-4 pb-2 pt-3 text-m-body-s text-m-on-surface-variant">
        Delivery by Fez ·{' '}
        <Link href="/page/terms-of-service" className="underline underline-offset-2">
          Terms
        </Link>{' '}
        ·{' '}
        <Link href="/page/privacy-policy" className="underline underline-offset-2">
          Privacy
        </Link>{' '}
        · © {new Date().getFullYear()} JulineMart
      </p>
    </section>
  );
}
