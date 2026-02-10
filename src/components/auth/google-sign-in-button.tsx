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
          const parsedUrl = new URL(url);
          const hashParams = new URLSearchParams(parsedUrl.hash.replace('#', ''));
          const queryParams = new URLSearchParams(parsedUrl.search);
          const credential =
            hashParams.get('id_token') ||
            queryParams.get('id_token') ||
            hashParams.get('credential') ||
            queryParams.get('credential');

          if (!credential) {
            return;
          }

          try {
            const { Browser } = await import('@capacitor/browser');
            await Browser.close();
          } catch {
            // Ignore Browser.close errors; some Android versions auto-close.
          }

          await handleCredentialResponse({ credential });
        } catch (error) {
          console.error('Deep link auth handling error:', error);
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

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_NATIVE_CLIENT_ID || '700183414398-mvagtt83dw92fcon8dhufg8mkjvqk8.apps.googleusercontent.com';
      
      // Google's Android OAuth requires this specific redirect URI format
      // Extract the reversed client ID part (before .apps.googleusercontent.com)
      const reversedClientId = clientId.split('.apps.googleusercontent.com')[0];
      const redirectUri = `com.googleusercontent.apps.${reversedClientId}:/oauth2redirect`;
      
      const scope = encodeURIComponent('openid email profile');
      const nonce = Math.random().toString(36).slice(2);
      
      console.log('🔐 Native Google Sign-In');
      console.log('Client ID:', clientId);
      console.log('Redirect URI:', redirectUri);

      oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=id_token` +
        `&scope=${scope}` +
        `&prompt=select_account` +
        `&nonce=${encodeURIComponent(nonce)}`;

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
