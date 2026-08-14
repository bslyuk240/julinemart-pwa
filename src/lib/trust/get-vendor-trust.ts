import type { SellerPerformanceMetrics, VendorTrustProfile, VerificationType } from '@/types/trust';

export type VendorTrustResponse = VendorTrustProfile & {
  store_name?: string;
  physical_store?: {
    area?: string | null;
    city?: string | null;
    state?: string | null;
    supports_pickup?: boolean;
    photos?: string[];
    opening_hours?: Record<string, unknown> | null;
  } | null;
};

const JLO_BASE = (
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_URL ||
  ''
).replace(/\/$/, '');

export async function getVendorTrust(vendorId: string): Promise<VendorTrustResponse | null> {
  if (!JLO_BASE || !vendorId) return null;

  try {
    const res = await fetch(
      `${JLO_BASE}/.netlify/functions/vendor-trust?vendor_id=${encodeURIComponent(vendorId)}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export function formatMetricPercent(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  return `${Number(value).toFixed(0)}%`;
}

export function verificationLabel(type: VerificationType): string {
  const labels: Record<VerificationType, string> = {
    identity: 'Identity verified',
    phone: 'Phone verified',
    bank_account: 'Bank verified',
    business_registration: 'Business verified',
    physical_store: 'Physical store',
    trusted_seller: 'Trusted seller',
    julinemart_assured: 'JulineMart Assured',
  };
  return labels[type] || type;
}

export function hasDisplayMetrics(metrics: SellerPerformanceMetrics | null | undefined): boolean {
  if (!metrics) return false;
  return (
    metrics.successful_orders > 0 ||
    metrics.fulfilment_rate != null ||
    metrics.dispute_rate != null
  );
}
