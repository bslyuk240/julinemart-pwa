'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { supabase } from '@/lib/supabase/client';
import { resendConfirmation } from '@/lib/auth-confirm';
import { trackSignupSuccess } from '@/lib/gtag';

type State = 'checking' | 'ok' | 'signin' | 'error';

const TRACKED_KEY = 'jm_signup_tracked';

/**
 * Landing page for the confirmation email's button. Supabase puts the session (or
 * an error) in the URL hash; the client library reads it, so this page only has to
 * wait for the result and say what happened.
 */
export default function EmailConfirmedPage() {
  const tier = useMobileTier() !== null;
  const router = useRouter();
  const [state, setState] = useState<State>('checking');
  const [errorText, setErrorText] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const decided = useRef(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const code = hash.get('error_code') || query.get('error_code');
    const description = hash.get('error_description') || query.get('error_description');

    const finish = (next: State) => {
      if (decided.current) return;
      decided.current = true;
      setState(next);
    };

    if (code || hash.get('error') || query.get('error')) {
      setErrorText(
        code === 'otp_expired'
          ? 'This confirmation link has expired or was already used.'
          : (description || 'This confirmation link is not valid.').replace(/\+/g, ' '),
      );
      finish('error');
      return undefined;
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) finish('ok');
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish('ok');
    });
    // Confirmed in a different browser than the one that signed up: no session here.
    const timer = setTimeout(() => finish('signin'), 6000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (state !== 'ok') return undefined;
    try {
      if (!window.sessionStorage.getItem(TRACKED_KEY)) {
        window.sessionStorage.setItem(TRACKED_KEY, '1');
        trackSignupSuccess({ method: 'email' });
      }
    } catch { /* storage unavailable */ }
    const t = setTimeout(() => router.replace('/account'), 2500);
    return () => clearTimeout(t);
  }, [state, router]);

  const resend = async () => {
    if (!email.trim()) {
      toast.error('Enter your email address');
      return;
    }
    setSending(true);
    const res = await resendConfirmation(email);
    setSending(false);
    if (res.ok) toast.success('Confirmation email sent. Check your inbox.');
    else toast.error(res.message);
  };

  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';

  return (
    <main
      className={clsx(
        'min-h-screen bg-gray-50 px-4 py-12',
        tier && 'max-md:block max-md:min-h-0 max-md:bg-m-surface max-md:px-0 max-md:pb-10 max-md:pt-0',
      )}
    >
      {tier && <MobileTopBar title="" backHref="/" />}
      <div className={clsx('mx-auto w-full max-w-md space-y-6', tier && 'max-md:px-6')}>
        <div className={clsx('text-center', tier && 'max-md:text-left')}>
          <Link href="/" className="inline-block">
            <Image src={logoSrc} alt="JulineMart" width={60} height={60} className={clsx('mx-auto', tier && 'max-md:mx-0 max-md:mt-2')} />
          </Link>
        </div>

        <div className={clsx('rounded-lg bg-white p-8 text-center shadow-md', tier && 'max-md:bg-transparent max-md:p-0 max-md:text-left max-md:shadow-none')}>
          {state === 'checking' && (
            <div className="py-6">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
              <p className="mt-4 text-sm text-gray-600">Confirming your email…</p>
            </div>
          )}

          {state === 'ok' && (
            <>
              <span className={clsx('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600', tier && 'max-md:mx-0')}>
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h2 className={clsx('text-2xl font-bold text-gray-900', tier && 'max-md:text-[28px] max-md:font-semibold max-md:leading-9 max-md:text-m-on-surface')}>
                Email confirmed
              </h2>
              <p className="mt-3 text-sm text-gray-600">Welcome to JulineMart! Taking you to your account…</p>
              <Link
                href="/account"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                Continue
              </Link>
            </>
          )}

          {state === 'signin' && (
            <>
              <span className={clsx('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-green-600', tier && 'max-md:mx-0')}>
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h2 className="text-2xl font-bold text-gray-900">Email confirmed</h2>
              <p className="mt-3 text-sm text-gray-600">Your email is confirmed. Sign in to continue.</p>
              <Link
                href="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700"
              >
                Sign in
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <span className={clsx('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600', tier && 'max-md:mx-0')}>
                <AlertCircle className="h-7 w-7" />
              </span>
              <h2 className="text-2xl font-bold text-gray-900">We could not confirm your email</h2>
              <p className="mt-3 text-sm text-gray-600">{errorText}</p>
              <div className="mt-6 space-y-3 text-left">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  fullWidth
                  autoComplete="email"
                />
                <button
                  type="button"
                  onClick={resend}
                  disabled={sending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {sending && <Loader2 className="h-4 w-4 animate-spin" />} Send a new confirmation email
                </button>
              </div>
              <p className="mt-5 text-sm text-gray-600">
                Already confirmed?{' '}
                <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
