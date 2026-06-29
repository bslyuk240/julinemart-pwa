// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://cdn.jsdelivr.net https://www.googletagmanager.com https://js.paystack.co",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https://*.supabase.co https://*.googleapis.com https://oauth2.googleapis.com https://accounts.google.com https://*.woocommerce.com https://*.sentry.io wss://*.supabase.co https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://api.paystack.co",
      "frame-src https://accounts.google.com https://checkout.paystack.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  compress: true,
  reactStrictMode: true,

  env: {
    NEXT_PUBLIC_APP_NAME: 'JulineMart',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    /** Set to `/julinemart-pwa` when hosting the Next app under that path (SW + `/api`). */
    NEXT_PUBLIC_BASE_PATH: (process.env.NEXT_PUBLIC_BASE_PATH || '').trim(),
  },

  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry organisation + project (matches your sentry.io project)
  org: 'julinemart-online',
  project: 'javascript-nextjs',

  // Upload source maps so Sentry shows real code in stack traces
  silent: true,

  // Automatically instrument Next.js API routes + server components
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,

  // Tree-shake Sentry debug code in production builds
  disableLogger: true,

  // Upload source maps to Sentry but exclude them from the browser bundle
  sourcemaps: {
    disable: false,
    deleteSourcemapsAfterUpload: true,
  },
});
