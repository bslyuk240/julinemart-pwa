export type WarrantyType = 'none' | 'manufacturer' | 'seller' | 'extended';

export type WarrantyStatus = 'none' | 'active' | 'expiring' | 'expired';

const WARRANTY_TYPE_LABELS: Record<WarrantyType, string> = {
  none: 'No warranty',
  manufacturer: 'Manufacturer warranty',
  seller: 'Seller warranty',
  extended: 'Extended warranty',
};

export function warrantyTypeLabel(type: WarrantyType | string | null | undefined): string {
  if (!type || type === 'none') return WARRANTY_TYPE_LABELS.none;
  return WARRANTY_TYPE_LABELS[type as WarrantyType] || 'Warranty';
}

export function formatWarrantyDuration(months: number | null | undefined): string {
  if (!months || months <= 0) return '';
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return years === 1 ? '1 year' : `${years} years`;
  return `${years}y ${rem}m`;
}

export function formatWarrantySummary(
  type: WarrantyType | string | null | undefined,
  months: number | null | undefined
): string | null {
  if (!type || type === 'none' || !months) return null;
  return `${warrantyTypeLabel(type)} · ${formatWarrantyDuration(months)}`;
}

export function getWarrantyStatus(
  type: WarrantyType | string | null | undefined,
  expiresAt: string | null | undefined
): WarrantyStatus {
  if (!type || type === 'none' || !expiresAt) return 'none';
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return 'none';
  const now = Date.now();
  if (expiry.getTime() < now) return 'expired';
  const daysLeft = (expiry.getTime() - now) / 86400000;
  if (daysLeft <= 30) return 'expiring';
  return 'active';
}

export function formatExpiryDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const WARRANTY_STATUS_STYLES: Record<
  WarrantyStatus,
  { label: string; className: string }
> = {
  none: { label: 'No warranty', className: 'bg-gray-100 text-gray-600' },
  active: { label: 'Under warranty', className: 'bg-green-100 text-green-800' },
  expiring: { label: 'Expires soon', className: 'bg-amber-100 text-amber-800' },
  expired: { label: 'Warranty expired', className: 'bg-gray-100 text-gray-500' },
};
