'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GoogleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  text?: 'signin' | 'signup';
  redirectTo?: string;
}

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'signin',
  redirectTo = '/account',
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [isNativePlatform, setIsNativePlatform] = useState(false);

  useEffect(() => {
    import('@capacitor/core').then(({ Capacitor }) => {
      setIsNativePlatform(Capacitor.isNativePlatform());
    }).catch(() => setIsNativePlatform(false));
  }, []);

  // ── Web: Google GSI button ──────────────────────────────────────────────────
  useEffect(() => {
    if (isNativePlatform) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google && buttonRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: text === 'signin' ? 'signin_with' : 'signup_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: buttonRef.current.offsetWidth,
        });
      }
    };

    return () => { try { document.body.removeChild(script); } catch {} };
  }, [isNativePlatform, text]);

  // ── Native: deep link listener ──────────────────────────────────────────────
  useEffect(() => {
    if (!isNativePlatform) return;
    let remove: (() => void) | undefined;

    import('@capacitor/app').then(({ App }) => {
      App.addListener('appUrlOpen', async ({ url }) => {
        try {
          const parsed = new URL(url);
          const isOauthCallback =
            (parsed.protocol === 'julinemart:' && parsed.hostname === 'oauth') ||
            parsed.pathname.includes('/auth/google/callback');
          if (!isOauthCallback) return;

          const code = new URLSearchParams(parsed.search).get('code');
          if (!code) return;

          try { const { Browser } = await import('@capacitor/browser'); await Browser.close(); } catch {}
          await handleAuthorizationCode(code);
        } catch (err) {
          console.error('Deep link auth error:', err);
          toast.error('Authentication failed');
        }
      }).then(listener => { remove = () => listener.remove(); });
    });

    return () => { if (remove) remove(); };
  }, [isNativePlatform]);

  // ── Shared: handle Google credential (JWT from GSI) ──────────────────────────
  const handleCredentialResponse = async (response: any) => {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();

      if (!data.success || !data.token_hash) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      // Exchange the server-generated token for a real Supabase session
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: data.email,
        token: data.token_hash,
        type: 'magiclink',
      });

      if (verifyErr) throw new Error(verifyErr.message);

      toast.success(data.first_name ? `Welcome, ${data.first_name}!` : 'Welcome to JulineMart!');
      onSuccess?.();
      router.push(redirectTo);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const msg = err?.message || 'Failed to sign in with Google';
      toast.error(msg);
      onError?.(msg);
    }
  };

  // ── Native: open Google OAuth browser ────────────────────────────────────────
  const handleNativeGoogleSignIn = async () => {
    try {
      const { Browser } = await import('@capacitor/browser');
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
      if (!clientId) throw new Error('Missing NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');

      const redirectUri = 'https://julinemart.com/auth/google/callback';
      const oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&prompt=select_account`;

      await Browser.open({ url: oauthUrl });
    } catch (err: any) {
      const msg = `Failed to open Google sign-in: ${err?.message || ''}`;
      toast.error(msg);
      onError?.(msg);
    }
  };

  // ── Native: exchange auth code for tokens ─────────────────────────────────
  async function handleAuthorizationCode(code: string) {
    const res = await fetch('/api/auth/google/token-exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri: 'https://julinemart.com/auth/google/callback' }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Token exchange failed');
    }
    const data = await res.json();
    if (data.id_token) {
      await handleCredentialResponse({ credential: data.id_token });
    } else {
      throw new Error('No ID token in response');
    }
  }

  return (
    <div>
      {isNativePlatform ? (
        <button
          type="button"
          onClick={handleNativeGoogleSignIn}
          className="w-full h-11 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
            <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
            <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
            <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
          </svg>
          Continue with Google
        </button>
      ) : (
        <div ref={buttonRef} className="w-full" />
      )}
    </div>
  );
}

declare global {
  interface Window { google: any; }
}
