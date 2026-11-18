'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLoading from '@/components/ui/page-loading';
import RewardsView, { type Wallet } from '@/components/rewards/rewards-view';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { rewardsFetch } from '@/lib/rewards';

export default function RewardsPage() {
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
        await navigator.share({ title: 'Join JulineMart', text: `Shop on JulineMart and we both earn ${name}.`, url: link });
        return;
      } catch { /* cancelled */ }
    }
    void copy();
  };

  if (authLoading || loading) return <PageLoading text="Loading your rewards..." />;

  return (
    <RewardsView
      state={state ?? { enabled: false }}
      claiming={claiming}
      copied={copied}
      onClaim={claim}
      onShare={share}
      onCopy={copy}
    />
  );
}
