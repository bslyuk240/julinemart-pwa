'use client';

import { clsx } from 'clsx';
import { Check, Coins, Copy, Flame, Gift, Loader2, Share2, Sparkles, Users } from 'lucide-react';
import AccountPageHeader from '@/components/account/account-page-header';
import StickyActionBar from '@/components/mobile/shell/sticky-action-bar';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import { formatNaira } from '@/lib/rewards';

export type Wallet = {
  enabled: boolean;
  programme?: {
    name: string;
    points_to_ngn: number;
    daily_claim: { enabled: boolean; points: number };
    streak: { enabled: boolean; length_days: number; bonus_points: number };
    redemption: { enabled: boolean; cap_percent: number; min_points: number };
    expiry: { enabled: boolean; days: number };
  };
  wallet?: {
    available_points: number;
    available_ngn: number;
    pending_points: number;
    pending_ngn: number;
  };
  daily?: { enabled: boolean; claimed_today: boolean; streak: number };
  referral?: {
    enabled: boolean;
    code: string | null;
    tiers: { min_ngn: number; max_ngn: number | null; points: number }[];
    referrals: { label: string; status: string; points: number; note: string | null }[];
    confirmed_count: number;
    pending_count: number;
    my_referral_attempt: { outcome: string; reason: string | null } | null;
  };
  history?: { id: string; entry_type: string; points: number; created_at: string }[];
};

const ENTRY_LABELS: Record<string, string> = {
  signup_bonus: 'Welcome bonus',
  daily_claim: 'Daily reward',
  streak_bonus: 'Streak bonus',
  purchase_reward: 'Purchase reward',
  referral_reward: 'Referral reward',
  redemption: 'Used at checkout',
  redemption_refund: 'Points returned',
  reversal: 'Adjustment',
  adjustment: 'Adjustment',
  expiry: 'Expired',
};

const REFERRAL_STATUS: Record<string, string> = {
  signed_up: 'Joined, waiting for first order',
  pending: 'Order placed, reward pending',
  available: 'Reward earned',
  void: 'Did not qualify',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

type RewardsViewProps = {
  state: Wallet;
  claiming: boolean;
  copied: boolean;
  onClaim: () => void;
  onShare: () => void;
  onCopy: () => void;
};

/**
 * Presentation only: the page owns loading and the actions.
 *
 * Layout is decided by CSS, per docs/mobile-tier-plan.md:
 *  - below `md` (phones): one column with the mobile design tokens, gated on the
 *    route allowlist (`tier`) so removing the route reverts it;
 *  - `lg` and up: a two-column dashboard (balance, daily reward and history on
 *    the left, a sticky referral card on the right), not the phone column
 *    stretched across the screen.
 */
export default function RewardsView({ state, claiming, copied, onClaim, onShare, onCopy }: RewardsViewProps) {
  const tier = useMobileTier() !== null;

  // Surfaces. The `max-md:` parts are no-ops unless the route is on the mobile allowlist.
  const card = clsx(
    'rounded-xl border border-gray-200 bg-white p-4 md:p-6',
    tier && 'max-md:rounded-m-card max-md:border-0 max-md:bg-m-surface-lowest max-md:p-4',
  );
  const cardFlush = clsx(
    'rounded-xl border border-gray-200 bg-white',
    tier && 'max-md:rounded-m-card max-md:border-0 max-md:bg-m-surface-lowest',
  );
  const cardTitle = clsx('font-semibold text-gray-900 md:text-lg', tier && 'max-md:text-m-title-m max-md:text-m-on-surface');
  const subtle = clsx('text-sm text-gray-600', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant');
  const divider = clsx('divide-y divide-gray-100', tier && 'max-md:divide-m-outline-variant');
  const pageCls = clsx('min-h-screen bg-gray-50 pb-24 md:pb-10', tier && 'max-md:bg-m-surface-low max-md:pb-4');

  const p = state.programme;
  const name = p?.name || 'JulinePoints';

  if (!state.enabled || !p) {
    return (
      <main className={pageCls}>
        <div className="container-custom py-5 md:py-8">
          <AccountPageHeader title="Rewards" subtitle="JulinePoints is not available yet." />
          <div className={clsx(card, 'mx-auto max-w-xl text-center md:py-12')}>
            <span className="mx-auto mb-3 hidden h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 md:flex">
              <Coins className="h-6 w-6" />
            </span>
            <p className={subtle}>Check back soon. We will let you know when you can start earning.</p>
          </div>
        </div>
      </main>
    );
  }

  const w = state.wallet!;
  const daily = state.daily!;
  const ref = state.referral!;
  const streakLen = p.streak.length_days;
  const streakDone = daily.streak % streakLen === 0 && daily.streak > 0 ? streakLen : daily.streak % streakLen;
  const showClaim = daily.enabled;

  const claimLabel = daily.claimed_today ? 'Claimed today' : `Claim ${p.daily_claim.points} points`;
  const claimIcon = claiming ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : daily.claimed_today ? (
    <Check className="h-4 w-4" />
  ) : (
    <Gift className="h-4 w-4" />
  );

  return (
    <main className={pageCls}>
      <div className="container-custom py-5 md:py-8">
        <AccountPageHeader title={name} subtitle="Earn points, then use them at checkout." />

        <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-12 lg:gap-6">
          {/* Balance */}
          <section
            className={clsx(
              'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 to-primary-500 p-5 text-white max-lg:order-1 md:p-8 lg:col-span-7',
              tier &&
                'max-md:rounded-m-sheet max-md:bg-none max-md:bg-m-primary-container max-md:p-5 max-md:text-m-on-primary-container',
            )}
          >
            <Coins aria-hidden className="pointer-events-none absolute -right-6 -top-6 hidden h-44 w-44 text-white/10 md:block" />
            <p className={clsx('text-sm text-primary-100 md:text-base', tier && 'max-md:text-m-label-l max-md:text-m-on-primary-container max-md:opacity-80')}>
              Available points
            </p>
            <p className="text-4xl font-bold tabular-nums max-md:text-5xl md:text-6xl">{w.available_points.toLocaleString()}</p>
            <p className={clsx('mt-1 text-sm text-primary-100', tier && 'max-md:text-m-body-m max-md:text-m-on-primary-container max-md:opacity-80')}>
              Worth {formatNaira(w.available_ngn)} off eligible items at checkout (1 point = {formatNaira(p.points_to_ngn)})
            </p>

            {w.pending_points > 0 && (
              <p
                className={clsx(
                  'mt-2 text-sm text-primary-100 md:hidden',
                  tier && 'max-md:mt-3 max-md:inline-block max-md:rounded-full max-md:bg-m-surface-lowest max-md:px-3 max-md:py-1.5 max-md:text-m-label-m max-md:text-m-on-surface',
                )}
              >
                {w.pending_points.toLocaleString()} pending ({formatNaira(w.pending_ngn)}), added after delivery
              </p>
            )}

            {/* Desktop stat strip */}
            <dl className="relative mt-6 hidden grid-cols-3 gap-3 md:grid">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <dt className="text-xs text-primary-100">Worth</dt>
                <dd className="text-lg font-semibold">{formatNaira(w.available_ngn)}</dd>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <dt className="text-xs text-primary-100">Pending</dt>
                <dd className="text-lg font-semibold">
                  {w.pending_points.toLocaleString()} <span className="text-sm font-normal text-primary-100">pts</span>
                </dd>
                <dd className="text-xs text-primary-100">added after delivery</dd>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <dt className="text-xs text-primary-100">At checkout</dt>
                <dd className="text-lg font-semibold">{p.redemption.enabled ? `Up to ${p.redemption.cap_percent}%` : 'Not available'}</dd>
                <dd className="text-xs text-primary-100">of eligible item value</dd>
              </div>
            </dl>
          </section>

          {/* Referral: right column on desktop, spans the left column's three rows */}
          {ref.enabled && ref.code && (
            <section className={clsx(card, 'max-lg:order-3 lg:col-span-5 lg:col-start-8 lg:row-span-3 lg:row-start-1 lg:self-start')}>
              <h2 className={clsx(cardTitle, 'flex items-center gap-2')}>
                <Users className="h-4 w-4 md:h-5 md:w-5" /> Refer a friend
              </h2>
              <p className={clsx('mt-1', subtle)}>
                When a friend you refer places their first order, you earn points based on its value, once it is delivered.
              </p>

              <ul className={clsx('mt-4 overflow-hidden rounded-lg border border-gray-200 text-sm', tier && 'max-md:border-m-outline-variant', divider)}>
                {ref.tiers.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className={clsx('text-gray-700', tier && 'max-md:text-m-body-m max-md:text-m-on-surface')}>
                      {t.max_ngn === null ? `${formatNaira(t.min_ngn)} and above` : `${formatNaira(t.min_ngn)} to under ${formatNaira(t.max_ngn)}`}
                    </span>
                    <span className="shrink-0 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                      {t.points} pts
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className={clsx(
                  'mt-4 rounded-lg bg-gray-50 p-3',
                  tier && 'max-md:rounded-m-card max-md:bg-m-surface-low',
                )}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500">Your referral code</p>
                <code className="mt-1 block text-center text-xl font-semibold tracking-widest text-gray-900 md:text-2xl">{ref.code}</code>
                <div className={clsx('mt-3 grid gap-2 md:grid-cols-2', tier && 'max-md:grid-cols-1')}>
                  <button
                    onClick={onShare}
                    className={clsx(
                      'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-primary-700',
                      tier && 'max-md:h-12 max-md:rounded-full max-md:bg-m-primary max-md:text-m-label-l max-md:text-m-on-primary',
                    )}
                  >
                    <Share2 className="h-4 w-4" /> Share link
                  </button>
                  <button
                    onClick={onCopy}
                    className={clsx(
                      'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50',
                      tier && 'max-md:h-12 max-md:rounded-full max-md:border-m-outline-variant max-md:bg-transparent max-md:text-m-label-l max-md:text-m-primary',
                    )}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>

              {ref.my_referral_attempt?.outcome === 'rejected' && (
                <p className="mt-3 text-sm text-amber-700">The referral code you used could not be applied to your account.</p>
              )}

              {ref.referrals.length > 0 && (
                <div className="mt-5">
                  <h3 className={clsx('mb-1 text-sm font-semibold text-gray-900', tier && 'max-md:text-m-title-s max-md:text-m-on-surface')}>
                    Your referrals{' '}
                    <span className="font-normal text-gray-500">
                      ({ref.confirmed_count} earned, {ref.pending_count} pending)
                    </span>
                  </h3>
                  <ul className={clsx('text-sm', divider)}>
                    {ref.referrals.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className={clsx('font-medium text-gray-900', tier && 'max-md:text-m-body-l max-md:text-m-on-surface')}>{r.label}</div>
                          <div className={clsx('text-gray-500', tier && 'max-md:text-m-body-s max-md:text-m-on-surface-variant')}>
                            {r.note || REFERRAL_STATUS[r.status] || r.status}
                          </div>
                        </div>
                        {r.status === 'available' && <span className="shrink-0 font-medium text-green-700">+{r.points}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Daily reward */}
          {showClaim && (
            <section className={clsx(card, 'max-lg:order-2 lg:col-span-7 lg:col-start-1')}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className={cardTitle}>Daily reward</h2>
                  <p className={subtle}>
                    {daily.claimed_today ? 'Claimed today. Come back tomorrow.' : `Claim ${p.daily_claim.points} points today.`}
                  </p>
                </div>
                {/* On phones the primary action lives in the pinned bar below. */}
                <button
                  onClick={onClaim}
                  disabled={claiming || daily.claimed_today}
                  className={clsx(
                    'inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-500',
                    tier && 'max-md:hidden',
                  )}
                >
                  {claimIcon}
                  {daily.claimed_today ? 'Claimed' : 'Claim'}
                </button>
              </div>

              {p.streak.enabled && (
                <div className="mt-4">
                  <div className={clsx('mb-3 flex items-center gap-1.5 text-sm text-gray-700', tier && 'max-md:text-m-body-m max-md:text-m-on-surface')}>
                    <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                    {daily.streak} day streak. Claim {streakLen} days in a row for {p.streak.bonus_points} bonus points.
                  </div>

                  {/* Phones: a slim progress bar */}
                  <div className="flex gap-1.5 md:hidden" aria-label={`${streakDone} of ${streakLen} days`}>
                    {Array.from({ length: streakLen }).map((_, i) => (
                      <span key={i} className={clsx('h-2 flex-1 rounded-full', i < streakDone ? 'bg-orange-500' : 'bg-gray-200', tier && i >= streakDone && 'max-md:bg-m-outline-variant')} />
                    ))}
                  </div>

                  {/* Desktop: one tile per day, the last one marked as the bonus day */}
                  <ol className="hidden gap-2 md:flex" aria-label={`${streakDone} of ${streakLen} days`}>
                    {Array.from({ length: streakLen }).map((_, i) => {
                      const done = i < streakDone;
                      const last = i === streakLen - 1;
                      return (
                        <li
                          key={i}
                          className={clsx(
                            'flex flex-1 flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-xs',
                            done ? 'border-orange-200 bg-orange-50 text-orange-700' : 'border-gray-200 bg-gray-50 text-gray-500',
                          )}
                        >
                          <span className="font-medium">Day {i + 1}</span>
                          {done ? <Check className="h-4 w-4" /> : last ? <Sparkles className="h-4 w-4 text-amber-500" /> : <span className="h-4 w-4" />}
                          {last && <span className="text-[11px] font-semibold">+{p.streak.bonus_points} bonus</span>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </section>
          )}

          {/* History */}
          <section className={clsx(cardFlush, 'max-lg:order-4 lg:col-span-7 lg:col-start-1')}>
            <h2 className={clsx(cardTitle, 'border-b border-gray-100 px-4 py-3 md:px-6 md:py-4', tier && 'max-md:border-m-outline-variant')}>History</h2>
            {(state.history || []).length === 0 ? (
              <p className={clsx('px-4 py-6 text-sm text-gray-500 md:px-6', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant')}>
                No activity yet. Claim your daily reward or place an order to get started.
              </p>
            ) : (
              <ul className={clsx('text-sm', divider)}>
                {state.history!.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
                    {/* Phones: label with the date underneath */}
                    <div className="md:hidden">
                      <div className={clsx('text-gray-900', tier && 'max-md:text-m-body-l max-md:text-m-on-surface')}>{ENTRY_LABELS[h.entry_type] || h.entry_type}</div>
                      <div className={clsx('text-xs text-gray-500', tier && 'max-md:text-m-body-s max-md:text-m-on-surface-variant')}>{fmtDate(h.created_at)}</div>
                    </div>
                    {/* Desktop: date | activity in one row */}
                    <div className="hidden min-w-0 flex-1 items-center gap-6 md:flex">
                      <span className="w-28 shrink-0 text-gray-500">{fmtDate(h.created_at)}</span>
                      <span className="truncate text-gray-900">{ENTRY_LABELS[h.entry_type] || h.entry_type}</span>
                    </div>
                    <span
                      className={clsx(
                        'font-semibold tabular-nums',
                        h.points > 0 ? 'text-green-700' : 'text-gray-700',
                        tier && (h.points > 0 ? 'max-md:text-m-success' : 'max-md:text-m-on-surface'),
                      )}
                    >
                      {h.points > 0 ? '+' : ''}
                      {h.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className={clsx('px-1 text-xs text-gray-500 max-lg:order-5 lg:col-span-12', tier && 'max-md:text-m-body-s max-md:text-m-on-surface-variant')}>
            {name} are reward points, not cash. They cannot be withdrawn or transferred, and can only be used on eligible items at
            checkout{p.redemption.enabled ? ` (up to ${p.redemption.cap_percent}% of eligible item value per order)` : ''}.
            {p.expiry.enabled ? ` Points expire ${p.expiry.days} days after they are earned.` : ''}
          </p>
        </div>
      </div>

      {tier && showClaim && (
        <StickyActionBar aboveTabBar>
          <button
            type="button"
            onClick={onClaim}
            disabled={claiming || daily.claimed_today}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-m-primary text-m-label-l text-m-on-primary active:opacity-90 disabled:bg-m-outline-variant disabled:text-m-on-surface-variant"
          >
            {claimIcon}
            {claimLabel}
          </button>
        </StickyActionBar>
      )}
    </main>
  );
}
