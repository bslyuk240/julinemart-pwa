'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DeletionShell from '@/components/account/deletion-shell';
import { useCustomerAuth } from '@/context/customer-auth-context';
import { deletionFetch, type DeletionReason } from '@/lib/account-deletion';

const DELETED = [
  'Your profile and sign-in',
  'Saved addresses, wishlist and saved cards',
  'Preferences, notifications and marketing data',
  'Any JulinePoints balance (it is forfeited)',
];
const KEPT = [
  'Order records for tax and accounting, with your name, phone and address removed',
  'Support conversations, for up to 3 years',
];

type View = 'loading' | 'ready' | 'blocked' | 'sent' | 'error';

export default function DeleteAccountPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const [view, setView] = useState<View>('loading');
  const [reasons, setReasons] = useState<DeletionReason[]>([]);
  const [sending, setSending] = useState(false);
  const [hint, setHint] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?redirect=/account/delete');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await deletionFetch('status');
        if (cancelled) return;
        if (!res || !res.data.success) throw new Error();
        if (res.data.eligible) setView('ready');
        else { setReasons(res.data.reasons || []); setView('blocked'); }
      } catch {
        if (!cancelled) { setErrorText('We could not check your account. Please try again.'); setView('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, isAuthenticated, router]);

  const sendLink = async () => {
    setSending(true);
    try {
      const res = await deletionFetch('request');
      if (res?.status === 409) { setReasons(res.data.reasons || []); setView('blocked'); return; }
      if (!res || !res.data.success) { toast.error(res?.data?.error || 'Could not send the email. Please try again.'); return; }
      setHint(res.data.sent_to_hint || 'your email');
      setView('sent');
    } catch {
      toast.error('Could not send the email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <DeletionShell title="Delete your account" backHref="/account/settings">
      {view === 'loading' && (
        <div className="py-10 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-600" /></div>
      )}

      {view === 'error' && (
        <p className="flex items-start gap-2 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorText}</p>
      )}

      {view === 'blocked' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">You can&apos;t delete your account just yet:</p>
          <ul className="space-y-2">
            {reasons.map((r) => (
              <li key={r.code} className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{r.message}</li>
            ))}
          </ul>
          <p className="text-sm text-gray-600">
            Need it done sooner? Email <a href="mailto:info@julinemart.com" className="font-medium text-primary-600 underline">info@julinemart.com</a>.
          </p>
          <Link href="/account/settings" className="inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Back to settings</Link>
        </div>
      )}

      {view === 'sent' && (
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Mail className="h-7 w-7" /></span>
          <h2 className="text-xl font-semibold text-gray-900">Check your email</h2>
          <p className="mt-3 text-sm text-gray-600">
            We sent a confirmation link to <span className="font-semibold text-gray-900">{hint}</span>. Open it on this device
            and confirm to finish. The link works once and expires in 1 hour.
          </p>
          <p className="mt-3 text-sm text-gray-500">Nothing is deleted until you confirm.</p>
          <Link href="/account" className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700">Back to my account</Link>
        </div>
      )}

      {view === 'ready' && (
        <div className="space-y-6">
          <p className="text-sm leading-6 text-gray-700">
            This permanently deletes your JulineMart account. To make sure it&apos;s really you, we&apos;ll first email you a link to confirm.
            This can&apos;t be undone.
          </p>
          <section>
            <h2 className="text-sm font-semibold text-gray-900">What gets deleted</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-700">{DELETED.map((d) => <li key={d}>• {d}</li>)}</ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-gray-900">What we keep</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-700">{KEPT.map((k) => <li key={k}>• {k}</li>)}</ul>
          </section>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={sendLink}
              disabled={sending}
              className={clsx('inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60')}
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />} Email me a confirmation link
            </button>
            <Link href="/account/settings" className="inline-flex flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Keep my account
            </Link>
          </div>
        </div>
      )}
    </DeletionShell>
  );
}
