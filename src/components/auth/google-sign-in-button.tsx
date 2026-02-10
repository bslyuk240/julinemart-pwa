// src/components/auth/google-sign-in-button.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/context/customer-auth-context';
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
  const { login } = useCustomerAuth();
  const router = useRouter();
  const [isNativePlatform, setIsNativePlatform] = useState(false);

  useEffect(() => {
    let mounted = true;

    const detectPlatform = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (mounted) {
          setIsNativePlatform(Capacitor.isNativePlatform());
        }
      } catch {
        if (mounted) {
          setIsNativePlatform(false);
        }
      }
    };

    detectPlatform();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (isNativePlatform) {
      return;
    }

    // Load Google Sign-In script
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

    return () => {
      document.body.removeChild(script);
    };
  }, [isNativePlatform, text]);

  useEffect(() => {
    if (!isNativePlatform) {
      return;
    }

    let removeListener: (() => void) | undefined;

    const setupDeepLinkListener = async () => {
      const { App } = await import('@capacitor/app');
      const listener = await App.addListener('appUrlOpen', async ({ url }) => {
        try {
          console.log('📱 Deep link received:', url);
          const parsedUrl = new URL(url);
          
          // Check if this is a Google OAuth callback
          if (!parsedUrl.pathname.includes('/auth/google/callback')) {
            console.log('⚠️ Not a Google OAuth callback, ignoring');
            return;
          }
          
          const queryParams = new URLSearchParams(parsedUrl.search);
          
          // Handle authorization code flow
          const code = queryParams.get('code');
          const error = queryParams.get('error');
          
          if (error) {
            console.error('❌ OAuth error:', error);
            toast.error(`Sign-in failed: ${error}`);
            return;
          }

          if (!code) {
            console.log('⚠️ No authorization code in URL');
            return;
          }

          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch {
            // Ignore Browser.close errors; some Android versions auto-close.
          }

          console.log('✅ Authorization code received, exchanging for token...');
          
          // Exchange authorization code for tokens
          await handleAuthorizationCode(code);
        } catch (error) {
          console.error('Deep link auth handling error:', error);
          toast.error('Authentication failed');
        }
      });

      removeListener = () => {
        listener.remove();
      };
    };

    setupDeepLinkListener();

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, [isNativePlatform]);

  const handleCredentialResponse = async (response: any) => {
    try {
      // Send credential to our backend
      const result = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: response.credential,
        }),
      });

      const data = await result.json();

      if (data.success && data.customerId) {
        // Login the customer
        await login(data.customerId);
        
        toast.success(
          data.customer?.first_name 
            ? `Welcome back, ${data.customer.first_name}!` 
            : 'Welcome to JulineMart!'
        );
        
        if (onSuccess) {
          onSuccess();
        }
        
        router.push(redirectTo);
      } else {
        const errorMsg = data.message || 'Google sign-in failed';
        toast.error(errorMsg);
        
        if (onError) {
          onError(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      const errorMsg = 'Failed to sign in with Google';
      toast.error(errorMsg);
      
      if (onError) {
        onError(errorMsg);
      }
    }
  };

  const handleNativeGoogleSignIn = async () => {
    let oauthUrl = '';

    try {
      const { Browser } = await import('@capacitor/browser');

      // Use Web OAuth client for Android with HTTPS redirect (App Links)
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '700183414398-ij42qe11gp86i2puuptag185eh6una16.apps.googleusercontent.com';
      
      // Use HTTPS redirect URI (App Links) - modern approach for Android
      const redirectUri = 'https://dev-lab--julinemart-pwa.netlify.app/auth/google/callback';
      
      const scope = encodeURIComponent('openid email profile');
      
      // Generate PKCE challenge for secure mobile OAuth
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Store code verifier for later use in callback
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pkce_code_verifier', codeVerifier);
      }
      
      console.log('🔐 Native Google Sign-In (Authorization Code Flow + PKCE)');
      console.log('Client ID:', clientId);
      console.log('Redirect URI:', redirectUri);

      // Use authorization code flow with PKCE (more secure for mobile)
      oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&prompt=select_account`;

      console.log('🌐 Opening Google OAuth...');
      await Browser.open({ url: oauthUrl });
    } catch (error: any) {
      console.error('Native Google sign-in launch error:', error);
      if (oauthUrl) {
        // Fallback: if Capacitor Browser bridge fails, use direct navigation.
        window.location.href = oauthUrl;
        return;
      }

      const errorMsg = `Failed to open Google sign-in${
        error?.message ? `: ${error.message}` : ''
      }`;
      toast.error(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  // Handle authorization code exchange
  async function handleAuthorizationCode(code: string) {
    try {
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      if (!codeVerifier) {
        throw new Error('PKCE verifier not found');
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '700183414398-ij42qe11gp86i2puuptag185eh6una16.apps.googleusercontent.com';
      const redirectUri = 'https://dev-lab--julinemart-pwa.netlify.app/auth/google/callback';

      console.log('🔄 Exchanging code for tokens...');
      
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
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
      console.log('✅ Tokens received');
      
      // Clean up verifier
      sessionStorage.removeItem('pkce_code_verifier');

      // Use the ID token with NextAuth
      if (tokens.id_token) {
        await handleCredentialResponse({ credential: tokens.id_token });
      } else {
        throw new Error('No ID token in response');
      }
    } catch (error) {
      console.error('❌ Token exchange error:', error);
      toast.error('Failed to complete sign-in');
      if (onError) onError(error instanceof Error ? error.message : 'Token exchange failed');
    }
  }

  // PKCE helper functions
  function generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return base64URLEncode(array);
  }

  async function generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return base64URLEncode(new Uint8Array(hash));
  }

  function base64URLEncode(buffer: Uint8Array): string {
    // Convert buffer to base64 in chunks to avoid call stack issues
    let binary = '';
    const len = buffer.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binary);
    // Convert to base64url format (RFC 4648)
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove padding
  }

  return (
    <div>
      {isNativePlatform ? (
        <button
          type="button"
          onClick={handleNativeGoogleSignIn}
          className="w-full h-11 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Continue with Google
        </button>
      ) : (
        <div ref={buttonRef} className="w-full" />
      )}
    </div>
  );
}

// Type declaration for Google Sign-In
declare global {
  interface Window {
    google: any;
  }
}
