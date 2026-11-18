'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { resendConfirmation } from '@/lib/auth-confirm';

const COOLDOWN_SECONDS = 60;

type Props = {
  email: string;
  /** Lets the customer go back and fix a mistyped address. Omit to hide the link. */
  onChangeEmail?: () => void;
  /** Heading variant: after sign-up, or after trying to sign in with an unconfirmed address. */
  reason?: 'signup' | 'login';
};

/** "Check your email" screen with a resend button. Used by sign-up and login. */
export default function ConfirmEmailPanel({ email, onChangeEmail, reason = 'signup' }: Props) {
  const tier = useMobileTier() !== null;
  const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS); // an email was just sent
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setSending(true);
    const res = await resendConfirmation(email);
    setSending(false);
    if (res.ok) {
      toast.success('Confirmation email sent');
      setCooldown(COOLDOWN_SECONDS);
    } else {
      toast.error(res.message);
    }
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
          <span className={clsx('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600', tier && 'max-md:mx-0')}>
            <Mail className="h-7 w-7" />
          </span>
          <h2 className={clsx('text-2xl font-bold text-gray-900', tier && 'max-md:text-[28px] max-md:font-semibold max-md:leading-9 max-md:text-m-on-surface')}>
            Check your email
          </h2>
          <p className={clsx('mt-3 text-sm text-gray-600', tier && 'max-md:text-m-body-l max-md:text-m-on-surface-variant')}>
            {reason === 'login'
              ? 'You need to confirm your email before you can sign in. We have sent the link to'
              : 'We have sent a confirmation link to'}{' '}
            <span className="break-all font-semibold text-gray-900">{email}</span>. Open it to finish setting up your account.
          </p>

          <ul className={clsx('mt-5 space-y-1.5 text-left text-sm text-gray-600', tier && 'max-md:text-m-body-m max-md:text-m-on-surface-variant')}>
            <li>• It can take a minute or two to arrive.</li>
            <li>• Look in your spam or promotions folder.</li>
            <li>• Open the link on this device to be signed in straight away.</li>
          </ul>

          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || sending}
            className={clsx(
              'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-500',
              tier && 'max-md:h-12 max-md:rounded-full max-md:bg-m-primary max-md:text-m-label-l max-md:text-m-on-primary max-md:disabled:bg-m-outline-variant max-md:disabled:text-m-on-surface-variant',
            )}
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend confirmation email'}
          </button>

          <div className="mt-5 space-y-2 text-sm">
            {onChangeEmail && (
              <button type="button" onClick={onChangeEmail} className="font-medium text-primary-600 hover:text-primary-700">
                Wrong email? Go back
              </button>
            )}
            <p className="text-gray-600">
              Already confirmed?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
