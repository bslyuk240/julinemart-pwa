'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Download, Share } from 'lucide-react';
import Image from 'next/image';
import { trackPwaInstallAccepted, trackPwaInstallPromptShown } from '@/lib/gtag';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getOrCreateAnonymousId(): string {
  try {
    const key = 'jm_anon_id';
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return 'unknown';
  }
}

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

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const hasTrackedPromptShownRef = useRef(false);

  useEffect(() => {
    const isInStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    setIsStandalone(isInStandalone);

    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

    if (!isInStandalone && daysSinceDismissed > 7) {
      if (iOS) {
        setTimeout(() => setShowPrompt(true), 3000);
      } else {
        const handler = (e: Event) => {
          e.preventDefault();
          setDeferredPrompt(e as BeforeInstallPromptEvent);
          setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
      }
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
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    if (isIOS) {
      logPwaEvent({ event_name: 'pwa_ios_guide_dismissed', platform: 'ios' });
    }
  };

  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300" />

      {/* Install Prompt */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md md:rounded-t-2xl">
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
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
            Install JulineMart
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Get the full app experience with faster loading and offline access
          </p>

          {/* iOS Instructions */}
          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-3">
                  📱 Install on iPhone/iPad:
                </p>
                <ol className="text-sm text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>
                      Tap the <Share className="w-4 h-4 inline mx-1" /> Share button at the bottom
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Scroll down and tap "Add to Home Screen"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Tap "Add" in the top right corner</span>
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
                <p className="text-sm text-green-800">
                  ✨ <strong>Benefits:</strong>
                </p>
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
