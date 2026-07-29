'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { GA_ID } from '@/lib/gtag';
import { CONSENT_CHANGE_EVENT, getStoredConsent } from '@/lib/cookie-consent';

/**
 * Consent-gated Google Analytics loader.
 *
 * Unlike the previous always-on Consent Mode setup, gtag/js is not injected at
 * all until the visitor has explicitly chosen "Accept analytics". This means no
 * request — not even a cookieless Consent Mode ping — reaches Google until opt-in.
 *
 * Returning visitors who already accepted load GA immediately on mount; a fresh
 * acceptance injects the script without a page reload via the consent-change event.
 */
export default function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === 'all') {
      setEnabled(true);
      return;
    }

    const onConsentChange = () => {
      if (getStoredConsent() === 'all') setEnabled(true);
    };

    window.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  );
}
