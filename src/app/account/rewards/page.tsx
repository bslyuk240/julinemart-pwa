'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { Check, Copy, Flame, Gift, Loader2, Share2, Users } from 'lucide-react';
import { toast } from 'sonner';
import AccountPageHeader from '@/components/account/account-page-header';
import PageLoading from '@/components/ui/page-loading';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { formatNaira, rewardsFetch } from '@/lib/rewards';

type Wallet = {
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

export default function RewardsPage() {
  const tier = useMobileTier() !== null;
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [state, setState] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await rewardsFetch<Wallet>('wallet');
      setState(res?.data ?? { enabled: false });
    } catch {
      toast.error('Could not load your rewards');
      setState({ enabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/account/rewards');
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load, router]);

  const claim = async () => {
    setClaiming(true);
    try {
      const res = await rewardsFetch<any>('claim');
      if (!res || !res.data?.success) {
        toast.error(res?.data?.error || 'Could not claim your reward');
      } else if (res.data.claim.already_claimed) {
        toast.message("You've already claimed today's reward");
      } else {
        const c = res.data.claim;
        toast.success(
          `+${c.points + c.streak_bonus_points} points added${c.streak_bonus_points ? ' (streak bonus!)' : ''}`,
        );
      }
      await load();
    } finally {
      setClaiming(false);
    }
  };

  const link = state?.referral?.code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${state.referral.code}`
    : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy the link');
    }
  };

  const share = async () => {
    const name = state?.programme?.name || 'JulinePoints';
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join JulineMart`, text: `Shop on JulineMart and we both earn ${name}.`, url: link });
        return;
      } catch { /* cancelled */ }
    }
    void copy();
  };

  if (authLoading || loading) return <PageLoading text="Loading your rewards..." />;

  const p = state?.programme;
  const name = p?.name || 'JulinePoints';

  if (!state?.enabled || !p) {
    return (
      <main className={clsx('min-h-screen bg-gray-50 pb-24 md:pb-8', tier && 'max-md:bg-m-surface-low')}>
        <div className="container-custom py-5 md:py-6">
          <AccountPageHeader title="Rewards" subtitle="JulinePoints is not available yet." />
          <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Check back soon. We will let you know when you can start earning.
          </p>
        </div>
      </main>
    );
  }

  const w = state.wallet!;
  const daily = state.daily!;
  const ref = state.referral!;
  const streakLen = p.streak.length_days;
  const streakDone = daily.streak % streakLen === 0 && daily.streak > 0 ? streakLen : daily.streak % streakLen;

  return (
    <main className={clsx('min-h-screen bg-gray-50 pb-24 md:pb-8', tier && 'max-md:bg-m-surface-low max-md:pb-4')}>
      <div className="container-custom space-y-4 py-5 md:py-6">
        <AccountPageHeader title={name} subtitle="Earn points, then use them at checkout." />

        <section className="rounded-2xl bg-primary-600 p-5 text-white">
          <p className="text-sm text-primary-100">Available points</p>
          <p className="text-4xl font-bold">{w.available_points.toLocaleString()}</p>
          <p className="text-sm text-primary-100">
            Worth {formatNaira(w.available_ngn)} off eligible items at checkout (1 point = {formatNaira(p.points_to_ngn)})
          </p>
          {w.pending_points > 0 && (
            <p className="mt-2 text-sm text-primary-100">
              {w.pending_points.toLocaleString()} pending ({formatNaira(w.pending_ngn)}), added after delivery
            </p>
          )}
        </section>

        {daily.enabled && (
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Daily reward</h2>
                <p className="text-sm text-gray-600">
                  {daily.claimed_today
                    ? 'Claimed today. Come back tomorrow.'
                    : `Claim ${p.daily_claim.points} points today.`}
                </p>
              </div>
              <button
                onClick={claim}
                disabled={claiming || daily.claimed_today}
                className="inline-flex min-w-[8rem] items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-gray-200 disabled:text-gray-500"
              >
                {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : daily.claimed_today ? <Check className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                {daily.claimed_today ? 'Claimed' : 'Claim'}
              </button>
            </div>
            {p.streak.enabled && (
              <div className="mt-4">
                <div className="mb-2 flex items-center gap-1.5 text-sm text-gray-700">
                  <Flame className="h-4 w-4 text-orange-500" />
                  {daily.streak} day streak. Claim {streakLen} days in a row for {p.streak.bonus_points} bonus points.
                </div>
                <div className="flex gap-1.5" aria-label={`${streakDone} of ${streakLen} days`}>
                  {Array.from({ length: streakLen }).map((_, i) => (
                    <span key={i} className={clsx('h-2 flex-1 rounded-full', i < streakDone ? 'bg-orange-500' : 'bg-gray-200')} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {ref.enabled && ref.code && (
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900"><Users className="h-4 w-4" /> Refer a friend</h2>
            <p className="mt-1 text-sm text-gray-600">
              When a friend you refer places their first order, you earn points based on its value, once it is delivered.
            </p>
            <ul className="mt-2 space-y-0.5 text-sm text-gray-700">
              {ref.tiers.map((t, i) => (
                <li key={i}>
                  {t.max_ngn === null ? `${formatNaira(t.min_ngn)} and above` : `${formatNaira(t.min_ngn)} to under ${formatNaira(t.max_ngn)}`}:{' '}
                  <span className="font-medium">{t.points} points</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 p-2">
              <code className="flex-1 truncate px-1 text-sm">{ref.code}</code>
              <button onClick={copy} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
              </button>
              <button onClick={share} className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-3 py-1.5 text-sm text-white">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
            {ref.my_referral_attempt?.outcome === 'rejected' && (
              <p className="mt-3 text-sm text-amber-700">
                The referral code you used could not be applied to your account.
              </p>
            )}
            {ref.referrals.length > 0 && (
              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {ref.referrals.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-gray-900">{r.label}</div>
                      <div className="text-gray-500">{r.note || REFERRAL_STATUS[r.status] || r.status}</div>
                    </div>
                    {r.status === 'available' && <span className="font-medium text-green-700">+{r.points}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-xl border border-gray-200 bg-white">
          <h2 className="border-b border-gray-100 px-4 py-3 font-semibold text-gray-900">History</h2>
          {(state.history || []).length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {state.history!.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <div className="text-gray-900">{ENTRY_LABELS[h.entry_type] || h.entry_type}</div>
                    <div className="text-xs text-gray-500">{new Date(h.created_at).toLocaleDateString()}</div>
                  </div>
                  <span className={clsx('font-medium', h.points > 0 ? 'text-green-700' : 'text-gray-700')}>
                    {h.points > 0 ? '+' : ''}{h.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="px-1 text-xs text-gray-500">
          {name} are reward points, not cash. They cannot be withdrawn or transferred, and can only be used on eligible items at
          checkout{p.redemption.enabled ? ` (up to ${p.redemption.cap_percent}% of eligible item value per order)` : ''}.
          {p.expiry.enabled ? ` Points expire ${p.expiry.days} days after they are earned.` : ''}
        </p>
      </div>
    </main>
  );
}
