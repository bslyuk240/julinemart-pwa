'use client';

import { clsx } from 'clsx';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  // Mobile tier (docs/mobile-tier-plan.md, wave 3): full-screen sign-in below md —
  // top bar with back, left-aligned title, form without the card frame.
  const tier = useMobileTier() !== null;
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Email is required'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email address'); return; }

    setIsLoading(true);
    setError('');
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: sbErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      if (sbErr) throw sbErr;
      setSent(true);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      toast.error('Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className={clsx('min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4', tier && 'max-md:block max-md:min-h-0 max-md:bg-m-surface max-md:px-0 max-md:pb-10 max-md:pt-0')}>
      {tier && <MobileTopBar title="" backHref="/login" />}
      <div className={clsx('max-w-md w-full space-y-8', tier && 'max-md:space-y-6 max-md:px-6')}>
        <div className={clsx('text-center', tier && 'max-md:text-left')}>
          <Link href="/" className="inline-block">
            <Image src={logoSrc} alt="JulineMart" width={60} height={60} className={clsx('mx-auto', tier && 'max-md:mx-0 max-md:mt-2')} />
          </Link>
          <h2 className={clsx('mt-6 text-3xl font-bold text-gray-900', tier && 'max-md:mt-5 max-md:text-[28px] max-md:font-semibold max-md:leading-9 max-md:text-m-on-surface')}>Forgot password?</h2>
          <p className="mt-2 text-sm text-gray-600">We&apos;ll send you a reset link</p>
        </div>

        <div className={clsx('bg-white rounded-lg shadow-md p-8', tier && 'max-md:bg-transparent max-md:p-0 max-md:shadow-none')}>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Check your email</h3>
              <p className="text-gray-600 text-sm">
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Link href="/login">
                <Button variant="primary" fullWidth>Back to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                error={error}
                startIcon={<Mail className="w-5 h-5" />}
                placeholder="you@example.com"
                fullWidth
                autoComplete="email"
                disabled={isLoading}
              />
              <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
