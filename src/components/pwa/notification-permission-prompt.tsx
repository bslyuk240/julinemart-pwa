'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Package, Truck, Tag, X } from 'lucide-react';
import { WEB_PUSH_ENABLE_EVENT } from '@/lib/web-push-events';

const PROMPT_SEEN_KEY = 'jm_notif_prompt_seen';
const PROMPT_SNOOZED_KEY = 'jm_notif_prompt_snoozed';
const SNOOZE_DAYS = 3;

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

async function logNotifEvent(eventName: string, platform: string) {
  try {
    await fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        platform,
        is_standalone: true,
        anonymous_id: getOrCreateAnonymousId(),
        source_page: typeof window !== 'undefined' ? window.location.pathname : '/',
      }),
    });
  } catch {
    // non-critical
  }
}

export default function NotificationPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState('web');
  const [requesting, setRequesting] = useState(false);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    // Require standalone on both iOS and Android:
    // - iOS: web push only works in standalone mode
    // - Android: install prompt (3 s) and notification prompt (2 s) are both
    //   bottom sheets — showing both in browser mode creates a stacked-overlay
    //   conflict. The right UX flow is install first, then enable notifications
    //   once the app is running as a standalone PWA.
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!isStandalone) return;

    const seen = localStorage.getItem(PROMPT_SEEN_KEY);
    if (seen) {
      const snoozedAt = localStorage.getItem(PROMPT_SNOOZED_KEY);
      if (!snoozedAt) {
        // Prompt was shown before but no snooze was recorded (user navigated away
        // without interacting). Start a snooze timer now so it can re-appear.
        localStorage.setItem(PROMPT_SNOOZED_KEY, Date.now().toString());
        return;
      }
      const daysSince = (Date.now() - parseInt(snoozedAt)) / (1000 * 60 * 60 * 24);
      if (daysSince < SNOOZE_DAYS) return;
    }

    setPlatform(isIOS ? 'ios' : 'android_pwa');

    const timer = setTimeout(() => setShow(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!show || trackedRef.current) return;
    trackedRef.current = true;
    localStorage.setItem(PROMPT_SEEN_KEY, '1');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    void logNotifEvent('notification_prompt_shown', isIOS ? 'ios' : 'android_pwa');
  }, [show]);

  const handleAllow = async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      // Called directly from the tap — satisfies iOS Safari's user-gesture requirement
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        void logNotifEvent('notification_prompt_allowed', platform);
        // Tell WebPushManager to proceed with FCM token registration
        window.dispatchEvent(new CustomEvent(WEB_PUSH_ENABLE_EVENT, { detail: {} }));
      } else {
        void logNotifEvent('notification_prompt_declined', platform);
      }
    } finally {
      setRequesting(false);
      setShow(false);
      localStorage.removeItem(PROMPT_SNOOZED_KEY);
    }
  };

  const handleSnooze = () => {
    void logNotifEvent('notification_prompt_snoozed', platform);
    localStorage.setItem(PROMPT_SNOOZED_KEY, Date.now().toString());
    setShow(false);
  };

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleSnooze}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-1/2 md:-translate-x-1/2 md:max-w-md">
        <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-2xl overflow-hidden relative">

          {/* Dismiss */}
          <button
            onClick={handleSnooze}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          {/* Brand header */}
          <div className="bg-gradient-to-br from-[#77088a] to-[#4a0558] px-6 pt-8 pb-7 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Bell className="w-8 h-8 text-white" fill="white" fillOpacity={0.3} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">Stay in the loop</h2>
              <p className="text-sm text-white/75 mt-0.5">
                Instant updates on your orders & deals
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="px-6 py-5 space-y-3.5">
            {([
              { Icon: Package, text: 'Order confirmed & ready to ship alerts' },
              { Icon: Truck,   text: 'Real-time delivery tracking updates' },
              { Icon: Tag,     text: 'Exclusive deals & flash sale drops' },
            ] as const).map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#77088a]" />
                </div>
                <span className="text-sm text-gray-700">{text}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-6 pb-8 pt-1 space-y-2.5">
            <button
              onClick={() => void handleAllow()}
              disabled={requesting}
              className="w-full bg-[#77088a] hover:bg-[#5e0670] disabled:opacity-60 text-white font-semibold py-3.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Bell className="w-4 h-4" />
              {requesting ? 'Enabling…' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleSnooze}
              className="w-full text-gray-400 hover:text-gray-600 font-medium py-2 transition-colors text-sm"
            >
              Not now
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
