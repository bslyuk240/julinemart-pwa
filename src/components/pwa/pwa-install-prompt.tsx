'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Share } from 'lucide-react';
import Image from 'next/image';
import { trackPwaInstallAccepted, trackPwaInstallPromptShown } from '@/lib/gtag';
import { safeStorage } from '@/lib/safe-storage';
import { getOrCreateAnonymousId } from '@/lib/analytics/anonymous-id';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY   = 'pwa-install-dismissed';
const VISIT_COUNT_KEY = 'jm_visit_count';
const DISMISS_COOLDOWN_DAYS = 14; // don't re-show for 2 weeks after dismiss

async function logPwaEvent(params: {
  event_name: string;
  platform: string;
  is_standalone?: boolean;
  customer_id?: string | null;
  source_page?: string;
}) {
  try {
    await fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        anonymous_id: getOrCreateAnonymousId(),
        source_page: params.source_page ?? window.location.pathname,
      }),
    });
  } catch {
    // non-critical
  }
}

function incrementAndGetVisitCount(): number {
  const raw = safeStorage.getItem(VISIT_COUNT_KEY);
  const prev = raw ? parseInt(raw, 10) : 0;
  const next = prev + 1;
  safeStorage.setItem(VISIT_COUNT_KEY, String(next));
  return next;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isReturningVisitor, setIsReturningVisitor] = useState(false);
  const hasTrackedPromptShownRef = useRef(false);

  useEffect(() => {
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isInStandalone);
    if (isInStandalone) return; // already installed — never show

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check dismiss cooldown
    const dismissed = safeStorage.getItem(DISMISSED_KEY);
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    if (daysSinceDismissed < DISMISS_COOLDOWN_DAYS) return;

    const visitCount = incrementAndGetVisitCount();
    const returning = visitCount > 1;
    setIsReturningVisitor(returning);

    if (iOS) {
      // iOS: only show on 2nd+ visit — user already knows the site
      if (visitCount < 2) return;
      const t = setTimeout(() => setShowPrompt(true), 15 * 1000);
      return () => clearTimeout(t);
    } else {
      // Android: wait for the browser install prompt, then wait 15 seconds
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        const t = setTimeout(() => setShowPrompt(true), 15 * 1000);
        // store timeout id for cleanup — we do it via returned cleanup
        (handler as any)._timeout = t;
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => {
        window.removeEventListener('beforeinstallprompt', handler);
        if ((handler as any)._timeout) clearTimeout((handler as any)._timeout);
      };
    }
  }, []);

  // Track appinstalled event (Android/Chrome confirms install)
  useEffect(() => {
    const handleAppInstalled = () => {
      logPwaEvent({ event_name: 'pwa_appinstalled', platform: 'android_desktop' });
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  useEffect(() => {
    if (!showPrompt) {
      hasTrackedPromptShownRef.current = false;
      return;
    }
    if (isStandalone || hasTrackedPromptShownRef.current) return;

    const platform = isIOS ? 'ios' : 'android_desktop';
    trackPwaInstallPromptShown({ platform });
    logPwaEvent({ event_name: 'pwa_install_prompt_shown', platform });
    hasTrackedPromptShownRef.current = true;
  }, [showPrompt, isStandalone, isIOS]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    logPwaEvent({ event_name: 'pwa_install_clicked', platform: 'android_desktop' });

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      trackPwaInstallAccepted({ platform: 'android_desktop' });
      logPwaEvent({ event_name: 'pwa_install_accepted', platform: 'android_desktop' });
    } else {
      logPwaEvent({ event_name: 'pwa_install_dismissed', platform: 'android_desktop' });
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeStorage.setItem(DISMISSED_KEY, Date.now().toString());
    if (isIOS) {
      logPwaEvent({ event_name: 'pwa_ios_guide_dismissed', platform: 'ios' });
    }
  };

  if (isStandalone || !showPrompt) return null;

  // Message varies based on whether this is a returning visitor
  const headline = isReturningVisitor
    ? 'Welcome back to JulineMart!'
    : 'Install JulineMart';

  const subtitle = isReturningVisitor
    ? 'Save it to your home screen for instant access — no browser needed'
    : 'Get the full app experience with faster loading and offline access';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300" />

      {/* Install Prompt */}
      <div className="fixed bottom-[var(--jm-vv-bottom-inset,0px)] left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-t-2xl">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl p-6 relative">
          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* App Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl shadow-lg overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Image
                src="/icon-192.png"
                alt="JulineMart"
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">{headline}</h2>
          <p className="text-center text-gray-600 mb-6">{subtitle}</p>

          {/* iOS Instructions */}
          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  📱 Add to your iPhone/iPad home screen:
                </p>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>
                      Tap the <Share className="w-4 h-4 inline mx-1" /> Share button at the bottom of Safari
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Tap <strong>"Add"</strong> in the top right corner</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Got it!
              </button>
            </div>
          ) : (
            // Android/Desktop Install Button
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">✨ <strong>Why install?</strong></p>
                <ul className="text-sm text-green-700 mt-2 space-y-1">
                  <li>• Faster loading times</li>
                  <li>• Works offline</li>
                  <li>• Full-screen experience</li>
                  <li>• Easy access from home screen</li>
                </ul>
              </div>

              <button
                onClick={handleInstallClick}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Install App
              </button>

              <button
                onClick={handleDismiss}
                className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 transition-colors"
              >
                Maybe later
              </button>
            </div>
          )}

          {/* Privacy Note */}
          <p className="text-xs text-center text-gray-500 mt-4">
            Free to install • No extra storage • Same great experience
          </p>
        </div>
      </div>
    </>
  );
}
