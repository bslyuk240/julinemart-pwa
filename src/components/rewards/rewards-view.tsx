'use client';

import { clsx } from 'clsx';
import { Check, Copy, Flame, Gift, Loader2, Share2, Users } from 'lucide-react';
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

type RewardsViewProps = {
  state: Wallet;
  claiming: boolean;
  copied: boolean;
  onClaim: () => void;
  onShare: () => void;
  onCopy: () => void;
};

/**
 * Presentation only: the page owns loading and the actions. Mobile tier
 * (docs/mobile-tier-plan.md): layout is decided by CSS (`max-md:`), gated on the
 * route allowlist so removing the route reverts it to the desktop look.
 */
export default function RewardsView({ state, claiming, copied, onClaim, onShare, onCopy }: RewardsViewProps) {
  const tier = useMobileTier() !== null;

  // Mobile-tier surface classes. Each is a no-op unless the route is on the allowlist.
  const card = clsx(
    'rounded-xl border border-gray-200 bg-white p-4',
    tier && 'max-md:rounded-m-card max-md:border-0 max-md:bg-m-surface-lowest',
  );
  // Same surface without padding, for sections whose rows run edge to edge.
  const cardFlush = clsx(
    'rounded-xl border border-gray-200 bg-white',
    tier && 'max-md:rounded-m-card max-md:border-0 max-md:bg-m-surface-lowest',
  );
  const cardTitle = clsx('font-semibold text-gray-900', tier && 'max-md:text-m-title-m max-md:text-m-on-surface');
  const subtle = clsx('text-sm text-gray-600', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant');
  const divider = clsx('divide-y divide-gray-100', tier && 'max-md:divide-m-outline-variant');
  const pageCls = clsx('min-h-screen bg-gray-50 pb-24 md:pb-8', tier && 'max-md:bg-m-surface-low max-md:pb-4');

  const p = state.programme;
  const name = p?.name || 'JulinePoints';

  if (!state.enabled || !p) {
    return (
      <main className={pageCls}>
        <div className="container-custom py-5 md:py-6">
          <AccountPageHeader title="Rewards" subtitle="JulinePoints is not available yet." />
          <p className={clsx(card, subtle)}>Check back soon. We will let you know when you can start earning.</p>
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
      <div className="container-custom space-y-4 py-5 md:py-6">
        <AccountPageHeader title={name} subtitle="Earn points, then use them at checkout." />

        <section
          className={clsx(
            'rounded-2xl bg-primary-600 p-5 text-white',
            tier && 'max-md:rounded-m-sheet max-md:bg-m-primary-container max-md:text-m-on-primary-container',
          )}
        >
          <p className={clsx('text-sm text-primary-100', tier && 'max-md:text-m-label-l max-md:text-m-on-primary-container max-md:opacity-80')}>
            Available points
          </p>
          <p className="text-4xl font-bold tabular-nums max-md:text-5xl">{w.available_points.toLocaleString()}</p>
          <p className={clsx('text-sm text-primary-100', tier && 'max-md:text-m-body-m max-md:text-m-on-primary-container max-md:opacity-80')}>
            Worth {formatNaira(w.available_ngn)} off eligible items at checkout (1 point = {formatNaira(p.points_to_ngn)})
          </p>
          {w.pending_points > 0 && (
            <p
              className={clsx(
                'mt-2 text-sm text-primary-100',
                tier && 'max-md:mt-3 max-md:inline-block max-md:rounded-full max-md:bg-m-surface-lowest max-md:px-3 max-md:py-1.5 max-md:text-m-label-m max-md:text-m-on-surface max-md:opacity-100',
              )}
            >
              {w.pending_points.toLocaleString()} pending ({formatNaira(w.pending_ngn)}), added after delivery
            </p>
          )}
        </section>

        {showClaim && (
          <section className={card}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className={cardTitle}>Daily reward</h2>
                <p className={subtle}>
                  {daily.claimed_today
                    ? 'Claimed today. Come back tomorrow.'
                    : `Claim ${p.daily_claim.points} points today.`}
                </p>
              </div>
              {/* On phones the primary action lives in the pinned bar below. */}
              <button
                onClick={onClaim}
                disabled={claiming || daily.claimed_today}
                className={clsx(
                  'inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-500',
                  tier && 'max-md:hidden',
                )}
              >
                {claimIcon}
                {daily.claimed_today ? 'Claimed' : 'Claim'}
              </button>
            </div>
            {p.streak.enabled && (
              <div className="mt-4">
                <div className={clsx('mb-2 flex items-center gap-1.5 text-sm text-gray-700', tier && 'max-md:text-m-body-m max-md:text-m-on-surface')}>
                  <Flame className="h-4 w-4 shrink-0 text-orange-500" />
                  {daily.streak} day streak. Claim {streakLen} days in a row for {p.streak.bonus_points} bonus points.
                </div>
                <div className="flex gap-1.5" aria-label={`${streakDone} of ${streakLen} days`}>
                  {Array.from({ length: streakLen }).map((_, i) => (
                    <span key={i} className={clsx('h-2 flex-1 rounded-full', i < streakDone ? 'bg-orange-500' : 'bg-gray-200', tier && i >= streakDone && 'max-md:bg-m-outline-variant')} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {ref.enabled && ref.code && (
          <section className={card}>
            <h2 className={clsx(cardTitle, 'flex items-center gap-2')}>
              <Users className="h-4 w-4" /> Refer a friend
            </h2>
            <p className={clsx('mt-1', subtle)}>
              When a friend you refer places their first order, you earn points based on its value, once it is delivered.
            </p>
            <ul className={clsx('mt-2 space-y-0.5 text-sm text-gray-700', tier && 'max-md:text-m-body-m max-md:text-m-on-surface')}>
              {ref.tiers.map((t, i) => (
                <li key={i}>
                  {t.max_ngn === null ? `${formatNaira(t.min_ngn)} and above` : `${formatNaira(t.min_ngn)} to under ${formatNaira(t.max_ngn)}`}:{' '}
                  <span className="font-medium">{t.points} points</span>
                </li>
              ))}
            </ul>
            <div
              className={clsx(
                'mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2',
                tier && 'max-md:flex-col max-md:items-stretch max-md:rounded-m-card max-md:bg-m-surface-low max-md:p-3',
              )}
            >
              <code className={clsx('flex-1 truncate px-1 text-sm', tier && 'max-md:text-center max-md:text-lg max-md:font-semibold max-md:tracking-widest')}>
                {ref.code}
              </code>
              <div className={clsx('flex gap-2', tier && 'max-md:flex-col')}>
                <button
                  onClick={onShare}
                  className={clsx(
                    'inline-flex items-center justify-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white',
                    tier && 'max-md:h-12 max-md:rounded-full max-md:bg-m-primary max-md:text-m-label-l max-md:text-m-on-primary max-md:order-first',
                  )}
                >
                  <Share2 className="h-4 w-4" /> Share link
                </button>
                <button
                  onClick={onCopy}
                  className={clsx(
                    'inline-flex items-center justify-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm',
                    tier && 'max-md:h-12 max-md:rounded-full max-md:border-m-outline-variant max-md:bg-transparent max-md:text-m-label-l max-md:text-m-primary',
                  )}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
            {ref.my_referral_attempt?.outcome === 'rejected' && (
              <p className="mt-3 text-sm text-amber-700">
                The referral code you used could not be applied to your account.
              </p>
            )}
            {ref.referrals.length > 0 && (
              <ul className={clsx('mt-3 text-sm', divider)}>
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
            )}
          </section>
        )}

        <section className={cardFlush}>
          <h2 className={clsx(cardTitle, 'border-b border-gray-100 px-4 py-3', tier && 'max-md:border-m-outline-variant')}>History</h2>
          {(state.history || []).length === 0 ? (
            <p className={clsx('px-4 py-4 text-sm text-gray-500', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant')}>
              No activity yet.
            </p>
          ) : (
            <ul className={clsx('text-sm', divider)}>
              {state.history!.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className={clsx('text-gray-900', tier && 'max-md:text-m-body-l max-md:text-m-on-surface')}>
                      {ENTRY_LABELS[h.entry_type] || h.entry_type}
                    </div>
                    <div className={clsx('text-xs text-gray-500', tier && 'max-md:text-m-body-s max-md:text-m-on-surface-variant')}>
                      {new Date(h.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'font-medium tabular-nums',
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

        <p className={clsx('px-1 text-xs text-gray-500', tier && 'max-md:text-m-body-s max-md:text-m-on-surface-variant')}>
          {name} are reward points, not cash. They cannot be withdrawn or transferred, and can only be used on eligible items at
          checkout{p.redemption.enabled ? ` (up to ${p.redemption.cap_percent}% of eligible item value per order)` : ''}.
          {p.expiry.enabled ? ` Points expire ${p.expiry.days} days after they are earned.` : ''}
        </p>
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
