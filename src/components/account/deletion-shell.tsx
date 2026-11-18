'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import AccountPageHeader from '@/components/account/account-page-header';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';

/**
 * Frame for the account-deletion screens. Follows the other account sub-pages
 * (docs/mobile-tier-plan.md, wave 2): titled top bar with Back, tinted page,
 * rounded cards, pill buttons, and the primary action pinned at the bottom on
 * phones. Desktop keeps the standard account page layout.
 */
export function useDeletionStyles() {
  const tier = useMobileTier() !== null;
  return {
    tier,
    card: clsx(
      'rounded-2xl bg-white p-5 shadow-sm md:p-6',
      tier && 'max-md:rounded-m-card max-md:bg-m-surface-lowest max-md:p-4 max-md:shadow-none',
    ),
    warnCard: clsx(
      'rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 md:p-6',
      tier && 'max-md:rounded-m-card max-md:p-4',
    ),
    title: clsx('text-base font-semibold text-gray-900 md:text-lg', tier && 'max-md:text-m-title-m max-md:text-m-on-surface'),
    body: clsx('text-sm leading-6 text-gray-600', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant'),
    list: clsx('mt-3 space-y-2 text-sm text-gray-700', tier && 'max-md:text-m-body-m max-md:text-m-on-surface'),
    danger: clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50',
      tier && 'max-md:h-12 max-md:w-full max-md:rounded-full max-md:bg-m-error max-md:text-m-label-l max-md:text-white max-md:active:opacity-90 max-md:disabled:bg-m-outline-variant max-md:disabled:text-m-on-surface-variant max-md:disabled:opacity-100',
    ),
    secondary: clsx(
      'inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50',
      tier && 'max-md:h-12 max-md:w-full max-md:rounded-full max-md:border-m-outline-variant max-md:bg-transparent max-md:text-m-label-l max-md:text-m-primary',
    ),
    link: clsx('text-sm font-medium text-primary-600 hover:text-primary-700', tier && 'max-md:text-m-label-l max-md:text-m-primary'),
  };
}

type ShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
  /** Primary action: pinned bar on phones, inline row on desktop. */
  action?: ReactNode;
  /** The pinned bar sits above the tab bar on routes that show it. */
  aboveTabBar?: boolean;
};

export default function DeletionShell({
  title,
  subtitle,
  backHref = '/account/settings',
  backLabel = 'Back to settings',
  children,
  action,
  aboveTabBar = true,
}: ShellProps) {
  const tier = useMobileTier() !== null;
  return (
    <main className={clsx('min-h-screen bg-gray-50 pb-24 md:pb-8', tier && 'max-md:bg-m-surface-low max-md:pb-4')}>
      <div className="container mx-auto max-w-2xl px-4 py-5 md:py-6">
        <AccountPageHeader title={title} subtitle={subtitle} backHref={backHref} backLabel={backLabel} />
        <div className="space-y-3 md:space-y-4">
          {children}
          {action && <div className={clsx('flex flex-col gap-3 md:flex-row', tier && 'max-md:hidden')}>{action}</div>}
        </div>
      </div>
      {tier && action && <StickyActionBar aboveTabBar={aboveTabBar}>{action}</StickyActionBar>}
    </main>
  );
}
