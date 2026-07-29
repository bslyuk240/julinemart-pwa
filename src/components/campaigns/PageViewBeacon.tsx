'use client';

import { useEffect } from 'react';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';

// Fires `scan` (only when ?qr_source= actually resolves to a real QR variant
// — an organic/direct visit shouldn't inflate scan counts) followed by
// `page_visit`, once per mount. Kept as its own tiny client component so the
// page shell above it can stay a server component.
export default function PageViewBeacon({
  campaignId,
  qrVariants = [],
}: {
  campaignId: string;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track, qrId } = useCampaignTelemetry(campaignId, qrVariants);

  useEffect(() => {
    if (qrId) track('scan');
    track('page_visit');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
