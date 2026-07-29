import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,

  // 10% of transactions traced in production, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // 5% of sessions recorded, 100% when an error occurs
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Tag every event so we know it came from the PWA
  initialScope: {
    tags: { app: 'julinemart-pwa' },
  },

  debug: false,

  // Ignore noisy browser errors we cannot control
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    // Android Chrome throws SecurityError (DOMException code 18) when storage
    // or push subscriptions are blocked by browser privacy settings — not actionable
    'SecurityError: The request was denied.',
    // Capacitor's LCP observer crashes in Facebook's iOS in-app browser where
    // window.webkit exists but window.webkit.messageHandlers is undefined.
    // Real fix: guard @capacitor/core imports with window.Capacitor check.
    /window\.webkit\.messageHandlers/,
    /^NetworkError/,
    /^ChunkLoadError/,
    /Loading chunk \d+ failed/,
  ],

  // beforeSend catches handled errors that ignoreErrors misses
  beforeSend(event) {
    const values = event.exception?.values ?? [];

    const isLocalStorageSecurityError = values.some(
      (v) =>
        v.type === 'SecurityError' &&
        (v.value?.includes('localStorage') || v.value?.includes('The request was denied'))
    );
    if (isLocalStorageSecurityError) return null;

    // AbortError is thrown when the browser cancels a fetch (e.g. Facebook
    // in-app browser navigating away mid-request). Not actionable — drop it.
    const isAbortError = values.some((v) => v.type === 'AbortError');
    if (isAbortError) return null;

    return event;
  },
});
