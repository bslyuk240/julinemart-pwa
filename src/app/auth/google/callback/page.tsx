'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function GoogleCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        // Redirect back to login with error
        router.push(`/auth/signin?error=${encodeURIComponent(error)}`);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        router.push('/auth/signin?error=no_code');
        return;
      }

      console.log('✅ Authorization code received in callback');

      // Broadcast the code to the opener window or handle it directly
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

          const clientId =
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
            process.env.NEXT_PUBLIC_GOOGLE_NATIVE_CLIENT_ID;
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
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="text-lg">Completing sign in...</p>
      </div>
    </div>
  );
}
