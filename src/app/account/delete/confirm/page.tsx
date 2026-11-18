'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import DeletionShell from '@/components/account/deletion-shell';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { supabase } from '@/lib/supabase/client';
import { deletionFetch, type DeletionReason } from '@/lib/account-deletion';

type View = 'ready' | 'deleting' | 'done' | 'blocked' | 'invalid';

/** Final step: reached from the emailed link. Needs a signed-in session AND the token. */
export default function ConfirmDeletePage() {
  const router = useRouter();
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
      <DeletionShell title="Delete your account" backHref="/">
        <div className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-600" /></div>
      </DeletionShell>
    );
  }

  return (
    <DeletionShell title={view === 'done' ? 'Account deleted' : 'Confirm deletion'} backHref="/account/settings">
      {!token && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />This link is not valid. Start again from your account settings.</p>
          <Link href="/account/delete" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Start again</Link>
        </div>
      )}

      {token && (view === 'ready' || view === 'deleting') && (
        <div className="space-y-5">
          <p className="text-sm leading-6 text-gray-700">
            This is the last step. Your account, sign-in, addresses and any JulinePoints balance will be permanently deleted.
            Order records are kept for tax with your personal details removed. <strong>This cannot be undone.</strong>
          </p>
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} disabled={view === 'deleting'}
              className="mt-0.5 h-4 w-4 rounded border-gray-300" />
            I understand this is permanent.
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={confirm} disabled={!understood || view === 'deleting'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {view === 'deleting' && <Loader2 className="h-4 w-4 animate-spin" />} Permanently delete my account
            </button>
            <Link href="/account" className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Keep my account
            </Link>
          </div>
        </div>
      )}

      {token && view === 'blocked' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">We can&apos;t delete your account just yet:</p>
          <ul className="space-y-2">{reasons.map((r) => <li key={r.code} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{r.message}</li>)}</ul>
          <Link href="/account" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Back to my account</Link>
        </div>
      )}

      {token && view === 'invalid' && (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>
          <Link href="/account/delete" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Start again</Link>
        </div>
      )}

      {view === 'done' && (
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600"><CheckCircle2 className="h-7 w-7" /></span>
          <p className="text-sm text-gray-700">Your account and personal data have been deleted. We&apos;ve emailed you a confirmation.</p>
          <Link href="/" className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700">Back to JulineMart</Link>
        </div>
      )}
    </DeletionShell>
  );
}
