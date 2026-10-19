'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import PageLoading from '@/components/ui/page-loading';
import Spinner from '@/components/ui/spinner';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Get search params from window.location in browser
    const urlParams = new URLSearchParams(window.location.search);
    
    if (!urlParams.toString()) return;
    
    const handleCallback = async () => {
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        logger.error('OAuth error', new Error(String(error)));
        router.push(`/?auth_error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code) {
        logger.error('No authorization code received');
        router.push('/?auth_error=no_code');
        return;
      }

      logger.info('Authorization code received in callback');

      // Ensure we're in the browser
      if (typeof window === 'undefined') {
        return;
      }

      // Check if we're running inside Capacitor
      const isCapacitor = window.location.href.includes('capacitor://') || 
                         (window as any).Capacitor?.isNativePlatform?.();

      // If in external browser (Chrome Custom Tabs), redirect back to app with custom scheme
      if (!isCapacitor) {
        const appUri = `julinemart://oauth?code=${encodeURIComponent(code)}&state=google`;
        logger.info('Redirecting to app via custom scheme');
        window.location.replace(appUri);
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = appUri;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, 250);
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            alert('If the app didn\'t open, tap "Open with" and choose JulineMart, or open the JulineMart app from your home screen.');
          }
        }, 3000);
        return;
      }

      // If already in Capacitor WebView, handle directly
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_OAUTH_CODE',
            code,
          },
          window.location.origin
        );
        window.close();
      } else {
        // If no opener, handle the token exchange here
        try {
          const redirectUri = `${window.location.origin}/auth/google/callback`;

          logger.info('Exchanging code for tokens via backend');

          const tokenResponse = await fetch('/api/auth/google/token-exchange', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              code,
              redirectUri,
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error || 'Token exchange failed');
          }

          const data = await tokenResponse.json();
          logger.info('Tokens received, signing in');

          // Sign in with NextAuth using the ID token
          const signInResponse = await fetch('/api/auth/callback/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credential: data.id_token,
            }),
          });

          if (signInResponse.ok) {
            router.push('/');
          } else {
            throw new Error('Sign in failed');
          }
        } catch (error) {
          logger.error('Token exchange error', error instanceof Error ? error : new Error(String(error)));
          router.push(
            `/?auth_error=${encodeURIComponent(
              error instanceof Error ? error.message : 'Token exchange failed'
            )}`
          );
        }
      }
    };

    handleCallback();
  }, [mounted, router]);

  if (!mounted) {
    return (
      <PageLoading />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div role="status" className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">Completing sign in...</p>
      </div>
    </div>
  );
}
