'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Mail, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import DeletionShell, { useDeletionStyles } from '@/components/account/deletion-shell';
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
  "A one-way fingerprint of your email (never the address itself), so sign-up and referral rewards can't be claimed twice",
];

type View = 'loading' | 'ready' | 'blocked' | 'sent' | 'error';

export default function DeleteAccountPage() {
  const router = useRouter();
  const s = useDeletionStyles();
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

  const action = view === 'ready' ? (
    <button type="button" onClick={sendLink} disabled={sending} className={s.danger}>
      {sending && <Loader2 className="h-4 w-4 animate-spin" />} Email me a confirmation link
    </button>
  ) : undefined;

  return (
    <DeletionShell title="Delete account" subtitle="Permanently remove your account and data" action={action}>
      {view === 'loading' && (
        <div className={s.card}><div className="py-6 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-primary-600" /></div></div>
      )}

      {view === 'error' && (
        <div className={s.warnCard}>
          <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{errorText}</p>
        </div>
      )}

      {view === 'blocked' && (
        <>
          <div className={s.card}>
            <h2 className={s.title}>You can&apos;t delete your account just yet</h2>
            <p className={`${s.body} mt-1`}>Please finish these first:</p>
          </div>
          {reasons.map((r) => (
            <div key={r.code} className={s.warnCard}><p className="text-sm leading-6">{r.message}</p></div>
          ))}
          <div className={s.card}>
            <p className={s.body}>
              Need it done sooner? Email <a href="mailto:info@julinemart.com" className="font-medium text-primary-600 underline">info@julinemart.com</a>.
            </p>
            <Link href="/account/settings" className={`${s.link} mt-3 inline-block`}>Back to settings</Link>
          </div>
        </>
      )}

      {view === 'sent' && (
        <div className={s.card}>
          <div className="text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600"><Mail className="h-7 w-7" /></span>
            <h2 className={s.title}>Check your email</h2>
            <p className={`${s.body} mt-2`}>
              We sent a confirmation link to <span className="font-semibold text-gray-900">{hint}</span>. Open it on this device and confirm to
              finish. The link works once and expires in 1 hour.
            </p>
            <p className={`${s.body} mt-2`}>Nothing is deleted until you confirm.</p>
            <Link href="/account" className={`${s.link} mt-4 inline-block`}>Back to my account</Link>
          </div>
        </div>
      )}

      {view === 'ready' && (
        <>
          <div className={s.warnCard}>
            <p className="text-sm leading-6">
              This permanently deletes your JulineMart account. To make sure it&apos;s really you, we&apos;ll first email you a link to
              confirm. <strong>This can&apos;t be undone.</strong>
            </p>
          </div>
          <div className={s.card}>
            <h2 className={s.title}>What gets deleted</h2>
            <ul className={s.list}>{DELETED.map((d) => <li key={d}>• {d}</li>)}</ul>
          </div>
          <div className={s.card}>
            <h2 className={s.title}>What we keep</h2>
            <ul className={s.list}>{KEPT.map((k) => <li key={k}>• {k}</li>)}</ul>
            <Link href="/account/settings" className={`${s.link} mt-4 inline-block`}>Keep my account</Link>
          </div>
        </>
      )}
    </DeletionShell>
  );
}
