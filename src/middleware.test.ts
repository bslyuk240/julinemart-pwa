import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// TST-602 — telemetry ingestion rate-limit check. Mocks @upstash/ratelimit's
// Ratelimit class so `.limit()` is fully controllable, rather than hitting a
// real (or fake) Redis instance.
const limitMock = vi.fn();
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    limit = limitMock;
    static slidingWindow = vi.fn((max: number, window: string) => ({ max, window }));
  },
}));
vi.mock('@upstash/redis', () => ({
  Redis: class {},
}));

import { middleware } from './middleware';

function makeRequest(path: string) {
  return new NextRequest(`http://localhost${path}`, { headers: { 'x-forwarded-for': '1.2.3.4' } });
}

beforeEach(() => {
  limitMock.mockReset();
  process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
  // Rate-limit gating only runs once the campaigns feature is on — without
  // this the request 404s before ever reaching the limiter.
  process.env.FEATURE_CAMPAIGNS_ENABLED = 'true';
});

describe('middleware — campaign analytics rate limit (Security Checklist §5: 20/10s)', () => {
  it('allows the request through when the limiter reports success', async () => {
    limitMock.mockResolvedValue({ success: true });
    const response = await middleware(makeRequest('/api/analytics/events'));
    expect(response.status).not.toBe(429);
  });

  it('returns 429 once the limiter reports the window is exceeded', async () => {
    limitMock.mockResolvedValue({ success: false });
    const response = await middleware(makeRequest('/api/analytics/events'));
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toMatch(/too many/i);
  });

  it('fails open (does not block the request) if the limiter itself errors', async () => {
    limitMock.mockRejectedValue(new Error('Redis unreachable'));
    const response = await middleware(makeRequest('/api/analytics/events'));
    expect(response.status).not.toBe(429);
  });
});

describe('middleware — campaigns feature flag gate', () => {
  it('404s /campaigns/* and /api/campaigns/* when the flag is off', async () => {
    process.env.FEATURE_CAMPAIGNS_ENABLED = 'false';
    const pageResponse = await middleware(makeRequest('/campaigns/kitchen-world-summer'));
    const apiResponse = await middleware(makeRequest('/api/campaigns/kitchen-world-summer'));
    // A rewrite to /404 doesn't itself carry a 404 status on the NextResponse
    // object, so assert on the rewritten destination instead.
    expect(new URL(pageResponse.headers.get('x-middleware-rewrite') || '', 'http://localhost').pathname).toBe('/404');
    expect(new URL(apiResponse.headers.get('x-middleware-rewrite') || '', 'http://localhost').pathname).toBe('/404');
  });

  it('does not rewrite unrelated routes when the flag is off', async () => {
    process.env.FEATURE_CAMPAIGNS_ENABLED = 'false';
    const response = await middleware(makeRequest('/product/some-product'));
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });
});
