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
          
          // Handle custom URI scheme (julinemart://oauth)
          if (parsedUrl.protocol === 'julinemart:' && parsedUrl.hostname === 'oauth') {
            console.log('✅ Custom URI OAuth callback detected');
            const queryParams = new URLSearchParams(parsedUrl.search);
            const code = queryParams.get('code');
            
            if (code) {
              try {
                const { Browser } = await import('@capacitor/browser');
                await Browser.close();
              } catch {
                // Ignore errors
              }
              
              console.log('✅ Authorization code received via custom URI, exchanging for token...');
              await handleAuthorizationCode(code);
            }
            return;
          }
          
          // Check if this is a Google OAuth callback (HTTPS App Link)
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
      console.log('🔑 Processing Google credential...');
      
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
      
      console.log('📊 Backend response:', { success: data.success, hasCustomerId: !!data.customerId });

      if (data.success && data.customerId) {
        // Login the customer
        console.log('✅ Logging in customer:', data.customerId);
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
        console.error('❌ Backend sign-in failed:', data);
        const errorMsg = data.message || data.error || 'Google sign-in failed';
        toast.error(errorMsg);
        
        if (onError) {
          onError(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('❌ Google sign-in error:', error);
      const errorMsg = error?.message || 'Failed to sign in with Google';
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

      // Use Android-specific Web OAuth client for Capacitor app
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '700183414398-un1b0ieej54djahu2pdsk8rim257luij.apps.googleusercontent.com';
      
      // Use HTTPS redirect URI (App Links) - modern approach for Android
      const redirectUri = 'https://dev-lab--julinemart-pwa.netlify.app/auth/google/callback';
      
      const scope = encodeURIComponent('openid email profile');
      
      console.log('🔐 Native Google Sign-In (Authorization Code Flow)');
      console.log('Client ID:', clientId);
      console.log('Redirect URI:', redirectUri);

      // Use authorization code flow (backend handles token exchange securely)
      oauthUrl =
        `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${scope}` +
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
      const redirectUri = 'https://dev-lab--julinemart-pwa.netlify.app/auth/google/callback';

      console.log('🔄 Exchanging code for tokens via backend...');
      
      // Use backend endpoint for secure token exchange
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
      console.log('✅ Tokens received from backend');

      // Use the ID token with NextAuth
      if (data.id_token) {
        console.log('🎫 Signing in with ID token...');
        await handleCredentialResponse({ credential: data.id_token });
      } else {
        console.error('❌ No ID token in backend response:', data);
        throw new Error('No ID token in response');
      }
    } catch (error) {
      console.error('❌ Token exchange error:', error);
      toast.error('Failed to complete sign-in');
      if (onError) onError(error instanceof Error ? error.message : 'Token exchange failed');
    }
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
