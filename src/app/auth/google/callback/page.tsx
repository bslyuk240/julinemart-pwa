'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    
    // If no parameters, just show waiting state (for direct URL access)
    if (!urlParams.toString()) {
      console.log('⏳ Waiting for OAuth redirect...');
      return;
    }
    
    const handleCallback = async () => {
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        // Redirect back to home with error toast
        router.push(`/?auth_error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        router.push('/?auth_error=no_code');
        return;
      }

      console.log('✅ Authorization code received in callback');

      // Ensure we're in the browser
      if (typeof window === 'undefined') {
        return;
      }

      // Check if we're running inside Capacitor
      const isCapacitor = window.location.href.includes('capacitor://') || 
                         (window as any).Capacitor?.isNativePlatform?.();

      // If in external browser (not Capacitor WebView), use custom URI to return to app
      if (!isCapacitor) {
        console.log('📲 Redirecting to app via custom URI...');
        // Use custom URI scheme to reliably return to app
        const appUri = `julinemart://oauth?code=${encodeURIComponent(code)}&state=google`;
        window.location.href = appUri;
        
        // Show message in case redirect doesn't work
        setTimeout(() => {
          alert('Please return to the JulineMart app to complete sign-in');
        }, 1000);
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
          const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
          if (!codeVerifier) {
            throw new Error('PKCE verifier not found');
          }

          // Use Android client for Capacitor, fallback to regular web client
          const clientId =
            process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
          const redirectUri = `${window.location.origin}/auth/google/callback`;

          console.log('🔄 Exchanging code for tokens...');

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              code,
              client_id: clientId!,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
              code_verifier: codeVerifier,
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            throw new Error(errorData.error_description || 'Token exchange failed');
          }

          const tokens = await tokenResponse.json();
          console.log('✅ Tokens received, signing in...');

          // Sign in with NextAuth using the ID token
          const signInResponse = await fetch('/api/auth/callback/credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              credential: tokens.id_token,
            }),
          });

          if (signInResponse.ok) {
            sessionStorage.removeItem('pkce_code_verifier');
            router.push('/');
          } else {
            throw new Error('Sign in failed');
          }
        } catch (error) {
          console.error('Token exchange error:', error);
          router.push(
            `/auth/signin?error=${encodeURIComponent(
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-lg font-medium text-gray-900">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-600 border-r-transparent"></div>
        <p className="text-lg font-medium text-gray-900">Completing sign in...</p>
        <p className="mt-2 text-sm text-gray-600">Processing OAuth callback</p>
      </div>
    </div>
  );
}
