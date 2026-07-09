import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Rate limiter setup ───────────────────────────────────────────────────────
// Uses Upstash Redis in production — persists across all serverless instances.
// Falls back to in-memory ephemeral store for local development only.

function buildLimiter(prefix: string, max: number, windowStr: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    return new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(max, windowStr),
      analytics: false,
      prefix,
    });
  }

  // Local dev fallback — ephemeral, single-instance only
  return new Ratelimit({
    redis: Redis.fromEnv(),   // will error if env missing — caught below
    limiter: Ratelimit.slidingWindow(max, windowStr),
    prefix,
  });
}

let authLimiter: Ratelimit | null = null;
let signupLimiter: Ratelimit | null = null;
let deviceLimiter: Ratelimit | null = null;

function getAuthLimiter(): Ratelimit | null {
  if (!authLimiter) {
    try { authLimiter = buildLimiter('rl:auth', 5, '15 m'); } catch { return null; }
  }
  return authLimiter;
}

function getSignupLimiter(): Ratelimit | null {
  if (!signupLimiter) {
    try { signupLimiter = buildLimiter('rl:signup', 10, '1 h'); } catch { return null; }
  }
  return signupLimiter;
}

// Device registration is a normal authenticated call that fires on page load,
// refresh, and re-login — and it's shared across users behind the same NAT/IP.
// It needs a generous abuse ceiling, not the strict signup limit.
function getDeviceLimiter(): Ratelimit | null {
  if (!deviceLimiter) {
    try { deviceLimiter = buildLimiter('rl:device', 60, '1 m'); } catch { return null; }
  }
  return deviceLimiter;
}

// Public read-only vendor status lookup, client-cached for 5 minutes (see
// vendor-filters.ts) — normal traffic is at most one call per session, so this
// ceiling only bites scraping/abuse bursts, not legitimate shared-NAT users.
let vendorsStatusLimiter: Ratelimit | null = null;
function getVendorsStatusLimiter(): Ratelimit | null {
  if (!vendorsStatusLimiter) {
    try { vendorsStatusLimiter = buildLimiter('rl:vendors-status', 60, '1 m'); } catch { return null; }
  }
  return vendorsStatusLimiter;
}

// Storefront pages that SSR-fetch the JLO catalog (products/categories/search/vendor)
// with `cache: 'no-store'` on every render — each hit is a real, uncached round trip
// to Supabase. JLO's own catalog-products/catalog-product functions now rate-limit
// per IP too, but throttling here stops abusive bursts before they even leave the
// edge. Ceiling is generous (browsing + shared-NAT traffic is bursty) — this is meant
// to catch sustained scraping, not real shoppers.
let catalogPageLimiter: Ratelimit | null = null;
function getCatalogPageLimiter(): Ratelimit | null {
  if (!catalogPageLimiter) {
    try { catalogPageLimiter = buildLimiter('rl:catalog-page', 200, '1 m'); } catch { return null; }
  }
  return catalogPageLimiter;
}

// ─── Auth paths ───────────────────────────────────────────────────────────────

const AUTH_PATHS          = ['/api/auth/', '/forgot-password', '/login'];
const SIGNUP_PATHS        = ['/api/audit/signup'];
const DEVICE_PATHS        = ['/api/notifications/register-device'];
const VENDORS_STATUS_PATHS = ['/api/vendors/status'];
const CATALOG_PAGE_PATHS  = [
  '/category/', '/product/', '/products', '/search', '/brand/', '/brands', '/vendor/', '/vendors', '/categories',
];

function matchesAny(pathname: string, patterns: string[]) {
  return patterns.some((p) => pathname.startsWith(p));
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getIp(request);

  if (matchesAny(pathname, AUTH_PATHS)) {
    const limiter = getAuthLimiter();
    if (limiter) {
      try {
        const { success, limit, remaining, reset } = await limiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please try again in 15 minutes.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': String(limit),
                'X-RateLimit-Remaining': String(remaining),
                'X-RateLimit-Reset': String(reset),
                'Retry-After': '900',
              },
            }
          );
        }
      } catch {
        // Redis unavailable — fail open, log and continue
        console.warn('[middleware] Rate limiter unavailable for auth route');
      }
    }
  }

  if (matchesAny(pathname, SIGNUP_PATHS)) {
    const limiter = getSignupLimiter();
    if (limiter) {
      try {
        const { success } = await limiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Try again in an hour.' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '3600' } }
          );
        }
      } catch {
        console.warn('[middleware] Rate limiter unavailable for signup route');
      }
    }
  }

  if (matchesAny(pathname, DEVICE_PATHS)) {
    const limiter = getDeviceLimiter();
    if (limiter) {
      try {
        const { success } = await limiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please slow down.' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
          );
        }
      } catch {
        console.warn('[middleware] Rate limiter unavailable for device route');
      }
    }
  }

  if (pathname === '/' || matchesAny(pathname, CATALOG_PAGE_PATHS)) {
    const limiter = getCatalogPageLimiter();
    if (limiter) {
      try {
        const { success } = await limiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please slow down.' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
          );
        }
      } catch {
        console.warn('[middleware] Rate limiter unavailable for catalog page route');
      }
    }
  }

  if (matchesAny(pathname, VENDORS_STATUS_PATHS)) {
    const limiter = getVendorsStatusLimiter();
    if (limiter) {
      try {
        const { success } = await limiter.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too many requests. Please slow down.' }),
            { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } }
          );
        }
      } catch {
        console.warn('[middleware] Rate limiter unavailable for vendors-status route');
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/audit/signup',
    '/api/notifications/register-device',
    '/api/vendors/status',
    '/forgot-password',
    '/login',
    '/',
    '/category/:path*',
    '/product/:path*',
    '/products',
    '/search',
    '/brand/:path*',
    '/brands',
    '/vendor/:path*',
    '/vendors',
    '/categories',
  ],
};
