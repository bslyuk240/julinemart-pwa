'use client';

import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import {
  type ConsentChoice,
  getStoredConsent,
  storeConsent,
  applyGaConsent,
} from '@/lib/cookie-consent';

export default function CookieConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();

    if (stored) {
      // Already decided — quietly restore GA4 consent and exit
      applyGaConsent(stored);
      return;
    }

    // First visit — show banner after a short delay so it doesn't compete
    // with page content loading
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleChoice = (choice: ConsentChoice) => {
    storeConsent(choice);
    applyGaConsent(choice);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className={[
        // Mobile: sit above bottom nav (3.5rem) + iOS home-indicator safe area.
        // md+: flush to bottom (no bottom nav on desktop).
        // Tailwind arbitrary value keeps specificity equal so md:bottom-0 wins
        // on desktop via source order (responsive utilities come last in output).
        'fixed left-0 right-0 z-40',
        'bottom-[calc(3.5rem_+_env(safe-area-inset-bottom,_0px))] md:bottom-0',
        'animate-in slide-in-from-bottom duration-300',
      ].join(' ')}
    >
      <div className="bg-white border-t border-gray-200 shadow-lg px-4 py-4 md:px-6">
        <div className="max-w-2xl mx-auto">

          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Cookie className="w-4 h-4 text-[#77088a] shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-gray-900">We use cookies</p>
            </div>
            {/* Dismiss without choosing = "essential only" */}
            <button
              onClick={() => handleChoice('essential')}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Dismiss — essential only"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            Essential cookies keep your cart and login working — always on.
            Analytics cookies (Google Analytics) help us understand how people
            use JulineMart so we can improve it.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleChoice('all')}
              className="flex-1 bg-[#77088a] hover:bg-[#5e0670] text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Accept analytics
            </button>
            <button
              onClick={() => handleChoice('essential')}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              Essential only
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
