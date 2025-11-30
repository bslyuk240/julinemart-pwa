'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const key = searchParams.get('key');
  const login = searchParams.get('login');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidKey, setIsValidKey] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Validate the reset key on page load
  useEffect(() => {
    const validateKey = async () => {
      if (!key || !login) {
        setIsValidKey(false);
        setValidationError('Invalid password reset link. Please request a new one.');
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/validate-reset-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, login }),
        });

        if (response.ok) {
          setIsValidKey(true);
        } else {
          const data = await response.json();
          setIsValidKey(false);
          setValidationError(data.error || 'Invalid or expired reset link.');
        }
      } catch (error) {
        // If validation endpoint doesn't exist, assume valid and let reset handle it
        console.warn('Key validation endpoint not available, proceeding with reset');
        setIsValidKey(true);
      } finally {
        setIsValidating(false);
      }
    };

    validateKey();
  }, [key, login]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (!key || !login) {
      toast.error('Invalid reset link');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, login, password }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetSuccess(true);
        toast.success('Password reset successfully!');
      } else {
        toast.error(data.error || 'Failed to reset password');
        
        // If key is invalid/expired, update state
        if (data.error?.includes('expired') || data.error?.includes('invalid')) {
          setIsValidKey(false);
          setValidationError(data.error);
        }
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating key
  if (isValidating) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Validating your reset link...</p>
          </div>
        </div>
      </main>
    );
  }

  // Invalid key state
  if (isValidKey === false) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h1>
              <p className="text-gray-600 mb-6">
                {validationError || 'This password reset link is invalid or has expired.'}
              </p>
              
              <Link href="/forgot-password">
                <Button variant="primary" size="lg" fullWidth>
                  Request New Reset Link
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Reset!</h1>
              <p className="text-gray-600 mb-6">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              
              <Link href="/login">
                <Button variant="primary" size="lg" fullWidth>
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Reset form
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-gray-600 mt-2">Enter your new password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter new password"
                required
                minLength={8}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Confirm new password"
                required
                disabled={isLoading}
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isLoading || password !== confirmPassword || password.length < 8}
            >
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}