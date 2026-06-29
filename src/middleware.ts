import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting (per-instance).
// For multi-instance production deployments, replace with Upstash Redis.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { success: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { success: false, remaining: 0 };
  }

  entry.count += 1;
  return { success: true, remaining: RATE_LIMIT_MAX - entry.count };
}

const RATE_LIMITED_PATHS = [
  '/api/auth/',
  '/api/audit/',
  '/api/notifications/register-device',
  '/forgot-password',
  '/login',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isRateLimited = RATE_LIMITED_PATHS.some(p => pathname.startsWith(p));

  if (isRateLimited) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';

    const key = `${ip}:${pathname}`;
    const result = checkRateLimit(key);

    if (!result.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again in 15 minutes.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(RATE_LIMIT_WINDOW_MS / 1000),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/audit/:path*',
    '/api/notifications/register-device',
    '/forgot-password',
    '/login',
  ],
};
