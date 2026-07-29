'use client';

import { useCallback, useMemo } from 'react';
import type { CampaignAnalyticsEventType } from '@/types/campaigns';

// FE-307 — client-side telemetry. Visitor session id is a random id persisted
// in localStorage so repeat visits within the same browser attribute to one
// session (not per-pageview). `?qr_source=` carries a QR variant's
// tracking_slug (not its id — the URL shouldn't leak the uuid), resolved here
// against the campaign's real QR variants (now that Phase 5's QR generator
// actually creates rows) so every event in the session — not just the scan
// itself — carries the right qr_id for the orchestrator's channel breakdown.

const SESSION_KEY = 'jm_campaign_visitor_session';

function getVisitorSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  try {
    const existing = window.localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(SESSION_KEY, fresh);
    return fresh;
  } catch {
    return `sess-${Date.now()}`;
  }
}

export interface CampaignQrVariantRef {
  id: string;
  trackingSlug: string;
}

export function useCampaignTelemetry(campaignId: string, qrVariants: CampaignQrVariantRef[] = []) {
  const visitorSessionId = useMemo(() => getVisitorSessionId(), []);

  const qrSource = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('qr_source') ?? params.get('utm_source') ?? undefined;
  }, []);

  const qrId = useMemo(() => {
    if (!qrSource) return undefined;
    return qrVariants.find((v) => v.trackingSlug === qrSource)?.id;
  }, [qrSource, qrVariants]);

  const track = useCallback(
    (eventType: CampaignAnalyticsEventType, metadata?: Record<string, unknown>) => {
      const payload = {
        campaignId,
        eventType,
        visitorSessionId,
        qrId,
        metadata: qrSource ? { qrSource, ...metadata } : metadata,
      };
      try {
        const body = JSON.stringify(payload);
        // sendBeacon so tracking survives page unload (e.g. clicking "Shop Now"
        // navigates away immediately after firing cta_click).
        if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
          navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }));
        } else {
          fetch('/api/analytics/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        // Telemetry must never break the shopping experience.
      }
    },
    [campaignId, visitorSessionId, qrSource, qrId]
  );

  return { track, qrId };
}
