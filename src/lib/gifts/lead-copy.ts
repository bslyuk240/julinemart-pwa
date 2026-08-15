/** Customer-facing gift wait copy from server prep days (item lead + packing). */

export function giftLeadCopy(leadTimeDays?: number | null): string | null {
  if (leadTimeDays == null || !Number.isFinite(Number(leadTimeDays))) return null;
  const n = Math.max(0, Math.round(Number(leadTimeDays)));
  if (n <= 1) return 'Usually ready next day';
  return `Usually ready in ${n} days`;
}
