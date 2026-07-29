import { describe, it, expect, vi, beforeEach } from 'vitest';

const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  return { insertMock, fromMock };
});
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServerClient: () => ({ from: fromMock }),
}));

import { POST } from './route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  insertMock.mockClear();
  fromMock.mockClear();
});

describe('POST /api/analytics/events', () => {
  it('accepts a valid event and inserts it', async () => {
    const response = await POST(
      makeRequest({
        campaignId: '11111111-1111-1111-1111-111111111111',
        eventType: 'page_visit',
        visitorSessionId: 'sess-1',
      })
    );
    expect(response.status).toBe(201);
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('rejects an invalid eventType with 400 and does not touch the database', async () => {
    const response = await POST(
      makeRequest({
        campaignId: '11111111-1111-1111-1111-111111111111',
        eventType: 'not_a_real_event',
        visitorSessionId: 'sess-1',
      })
    );
    expect(response.status).toBe(400);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON with 400', async () => {
    const request = new Request('http://localhost/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  // Matches the Security Checklist item: errors never leak raw DB internals.
  it('returns a generic message (not the raw DB error) on insert failure', async () => {
    insertMock.mockResolvedValueOnce({ error: { message: 'relation "campaign_analytics_events" leaked detail' } });
    const response = await POST(
      makeRequest({
        campaignId: '11111111-1111-1111-1111-111111111111',
        eventType: 'scan',
        visitorSessionId: 'sess-1',
      })
    );
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error).not.toContain('relation');
  });
});
