// @ts-check
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
