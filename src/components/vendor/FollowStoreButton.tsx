'use client';

import { useCallback, useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

type FollowStoreButtonProps = {
  vendorId: string;
  vendorName?: string;
  className?: string;
  /** Standalone card vs compact inline (icon mobile, pill desktop) */
  variant?: 'default' | 'inline';
};

export default function FollowStoreButton({
  vendorId,
  vendorName,
  className = '',
  variant = 'default',
}: FollowStoreButtonProps) {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const isInline = variant === 'inline';
  const label = following ? 'Following' : isInline ? 'Follow' : 'Follow store';
  const ariaLabel = following
    ? `Unfollow ${vendorName || 'store'}`
    : `Follow ${vendorName || 'store'}`;

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || !vendorId) {
      setFollowing(false);
      setChecked(true);
      return;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`/api/stores/${encodeURIComponent(vendorId)}/follow`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const json = await res.json();
        setFollowing(Boolean(json.following));
      }
    } catch {
      /* non-fatal */
    } finally {
      setChecked(true);
    }
  }, [isAuthenticated, vendorId]);

  useEffect(() => {
    if (!isLoading) loadStatus();
  }, [isLoading, loadStatus]);

  const toggle = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to follow stores');
      return;
    }
    setBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const method = following ? 'DELETE' : 'POST';
      const res = await fetch(`/api/stores/${encodeURIComponent(vendorId)}/follow`, {
        method,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Could not update follow');
      setFollowing(!following);
      toast.success(
        following
          ? `Unfollowed ${vendorName || 'store'}`
          : `Following ${vendorName || 'store'}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update follow');
    } finally {
      setBusy(false);
    }
  };

  const baseClass = isInline
    ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-95 disabled:opacity-60 md:h-auto md:w-auto md:gap-1.5 md:rounded-lg md:px-3 md:py-1.5 md:text-sm md:font-semibold'
    : 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60';

  const stateClass = following
    ? 'border-primary-200 bg-primary-50 text-primary-700'
    : isInline
      ? 'border-gray-200 bg-gray-50 text-gray-700 md:hover:border-primary-300'
      : 'border-gray-200 bg-white text-gray-900 hover:border-primary-300';

  if (!checked && isAuthenticated) {
    return (
      <button
        type="button"
        disabled
        aria-label="Loading follow status"
        className={`${baseClass} border-gray-200 text-gray-400 ${className}`}
      >
        <Heart className="h-4 w-4" />
        {!isInline && 'Follow'}
        {isInline && <span className="hidden md:inline">Follow</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={isInline ? ariaLabel : undefined}
      className={`${baseClass} ${stateClass} ${className}`}
    >
      <Heart className={`h-4 w-4 ${following ? 'fill-primary-600 text-primary-600' : ''}`} />
      {isInline ? (
        <span className="hidden md:inline">{label}</span>
      ) : (
        label
      )}
    </button>
  );
}
