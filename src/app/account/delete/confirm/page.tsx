'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import DeletionShell, { useDeletionStyles } from '@/components/account/deletion-shell';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { supabase } from '@/lib/supabase/client';
import { deletionFetch, type DeletionReason } from '@/lib/account-deletion';

type View = 'ready' | 'deleting' | 'done' | 'blocked' | 'invalid';

/** Final step: reached from the emailed link. Needs a signed-in session AND the token. */
export default function ConfirmDeletePage() {
  const router = useRouter();
  const s = useDeletionStyles();
  const { isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View>('ready');
  const [understood, setUnderstood] = useState(false);
  const [message, setMessage] = useState('');
  const [reasons, setReasons] = useState<DeletionReason[]>([]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token');
    setToken(t && /^[a-f0-9]{64}$/.test(t) ? t : '');
  }, []);

  useEffect(() => {
    if (authLoading || token === null || view === 'done' || view === 'deleting') return;
    if (token && !isAuthenticated) {
      // Come back here after signing in; the link keeps working.
      router.replace(`/login?redirect=${encodeURIComponent(`/account/delete/confirm?token=${token}`)}`);
    }
  }, [authLoading, isAuthenticated, token, view, router]);

  const confirm = async () => {
    if (!token) return;
    setView('deleting');
    try {
      const res = await deletionFetch('confirm', token);
      if (res?.status === 409) { setReasons(res.data.reasons || []); setView('blocked'); return; }
      if (!res || !res.data.success) {
        setMessage(res?.data?.error || 'Something went wrong. Please try again.');
        setView('invalid');
        return;
      }
      await supabase.auth.signOut();
      setView('done');
    } catch {
      setMessage('Something went wrong. Please try again.');
      setView('invalid');
    }
  };

  if (view !== 'done' && (token === null || authLoading || (token && !isAuthenticated))) {
    return (
      <DeletionShell title="Confirm deletion" aboveTabBar={false}>
        <div className={s.card}><div className="py-6 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-600" /></div></div>
      </DeletionShell>
    );
  }

  const canAct = !!token && (view === 'ready' || view === 'deleting');
  const action = canAct ? (
    <button type="button" onClick={confirm} disabled={!understood || view === 'deleting'} className={s.danger}>
      {view === 'deleting' && <Loader2 className="h-4 w-4 animate-spin" />} Permanently delete my account
    </button>
  ) : undefined;

  return (
    <DeletionShell
      title={view === 'done' ? 'Account deleted' : 'Confirm deletion'}
      subtitle={view === 'done' ? undefined : 'Last step. This cannot be undone'}
      backHref="/account/settings"
      aboveTabBar={false}
      action={action}
    >
      {!token && (
        <div className={s.warnCard}>
          <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />This link is not valid. Start again from your account settings.</p>
          <Link href="/account/delete" className={`${s.link} mt-3 inline-block`}>Start again</Link>
        </div>
      )}

      {canAct && (
        <>
          <div className={s.warnCard}>
            <p className="text-sm leading-6">
              Your account, sign-in, addresses and any JulinePoints balance will be permanently deleted. Order records are kept for tax with
              your personal details removed. <strong>This cannot be undone.</strong>
            </p>
          </div>
          <div className={s.card}>
            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} disabled={view === 'deleting'}
                className="mt-0.5 h-5 w-5 rounded border-gray-300" />
              <span className={s.body}>I understand this is permanent.</span>
            </label>
            <Link href="/account" className={`${s.link} mt-4 inline-block`}>Keep my account</Link>
          </div>
        </>
      )}

      {token && view === 'blocked' && (
        <>
          <div className={s.card}><h2 className={s.title}>We can&apos;t delete your account just yet</h2></div>
          {reasons.map((r) => <div key={r.code} className={s.warnCard}><p className="text-sm leading-6">{r.message}</p></div>)}
          <div className={s.card}><Link href="/account" className={s.link}>Back to my account</Link></div>
        </>
      )}

      {token && view === 'invalid' && (
        <div className={s.warnCard}>
          <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>
          <Link href="/account/delete" className={`${s.link} mt-3 inline-block`}>Start again</Link>
        </div>
      )}

      {view === 'done' && (
        <div className={s.card}>
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600"><CheckCircle2 className="h-7 w-7" /></span>
            <p className={s.body}>Your account and personal data have been deleted. We&apos;ve emailed you a confirmation.</p>
            <Link href="/" className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-medium text-white hover:bg-primary-700 max-md:bg-m-primary max-md:text-m-label-l max-md:text-m-on-primary">
              Back to JulineMart
            </Link>
          </div>
        </div>
      )}
    </DeletionShell>
  );
}
