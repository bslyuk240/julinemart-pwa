// src/components/auth/google-sign-in-button.tsx
'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
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
  }, [text]);

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

  return (
    <div>
      <div ref={buttonRef} className="w-full" />
    </div>
  );
}

// Type declaration for Google Sign-In
declare global {
  interface Window {
    google: any;
  }
}