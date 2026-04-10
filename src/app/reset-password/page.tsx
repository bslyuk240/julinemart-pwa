'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import PageLoading from '@/components/ui/page-loading';

function ResetPasswordContent() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase redirects back with access_token in the URL hash
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
    // Also listen in case Supabase sets the session from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'PASSWORD_RECOVERY') setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Password is required';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password))
      errs.password = 'Must include uppercase, lowercase, and number';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully!');
      router.push('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-600">Verifying your reset link...</p>
        <p className="text-sm text-gray-500">
          If this page doesn&apos;t load, your link may have expired.{' '}
          <Link href="/forgot-password" className="text-primary-600 hover:text-primary-700">Request a new one</Link>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="New Password"
        type={showPassword ? 'text' : 'password'}
        value={password}
        onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
        error={errors.password}
        startIcon={<Lock className="w-5 h-5" />}
        endIcon={
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="focus:outline-none" tabIndex={-1}>
            {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
          </button>
        }
        placeholder="Min. 8 characters"
        helperText="Must include uppercase, lowercase, and number"
        fullWidth
        autoComplete="new-password"
      />
      <Input
        label="Confirm New Password"
        type={showPassword ? 'text' : 'password'}
        value={confirmPassword}
        onChange={e => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
        error={errors.confirmPassword}
        startIcon={<Lock className="w-5 h-5" />}
        placeholder="Re-enter new password"
        fullWidth
        autoComplete="new-password"
      />
      <Button type="submit" variant="primary" size="lg" fullWidth isLoading={isLoading} disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Reset password</h2>
          <p className="mt-2 text-sm text-gray-600">Enter your new password below</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-8">
          <Suspense fallback={<PageLoading text="Loading..." />}>
            <ResetPasswordContent />
          </Suspense>
        </div>
        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Back to login</Link>
        </div>
      </div>
    </main>
  );
}
