import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

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
    /^NetworkError/,
    /^ChunkLoadError/,
    /Loading chunk \d+ failed/,
  ],
});
