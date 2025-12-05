const RAW_JLO_BASE =
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_URL ||
  'https://jlo.julinemart.com';

export type JloReturnShipment = {
  shipment_id?: string;
  method?: 'pickup' | 'dropoff';
  return_code?: string;
  fez_tracking?: string | null;
  tracking_url?: string | null;
  status?: string;
};

export type JloReturnLineItem = {
  wc_order_item_id: number;
  product_id: number;
  variation_id?: number;
  qty: number;
  unit_price?: number;
  name?: string;
};

export type JloRefundInfo = {
  refund_status?: 'none' | 'pending' | 'completed' | 'failed';
  refund_amount?: number;
  refund_currency?: string;
  refund_method?: string;
  refund_completed_at?: string;
};

export type JloReturn = {
  return_id: string;
  order_id: number;
  order_number?: string;
  status: string;
  created_at?: string;
  preferred_resolution?: 'refund' | 'replacement';
  reason_code?: string;
  reason_note?: string;
  images?: string[];
  line_items?: JloReturnLineItem[];
  return_shipments?: JloReturnShipment[];
} & JloRefundInfo;

export function getJloBaseUrl() {
  return RAW_JLO_BASE.replace(/\/$/, '');
}

export function formatJloReturnStatus(
  status: string | undefined
): { label: string; color: string; bgColor: string } {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    requested: { label: 'Requested', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    pickup_scheduled: { label: 'Pickup Scheduled', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
    in_transit: { label: 'In Transit', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    delivered_to_hub: { label: 'At Hub', color: 'text-teal-700', bgColor: 'bg-teal-100' },
    inspection_in_progress: { label: 'Inspection', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
    rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
    refund_processing: { label: 'Refund Processing', color: 'text-sky-700', bgColor: 'bg-sky-100' },
    refund_completed: { label: 'Refund Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  };
  return status && map[status] ? map[status] : { label: status || 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
}

export function formatJloRefundStatus(
  status: JloRefundInfo['refund_status']
): { label: string; color: string; bgColor: string } {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    none: { label: 'No Refund', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    pending: { label: 'Refund Pending', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    completed: { label: 'Refund Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    failed: { label: 'Refund Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
  };
  return status && map[status] ? map[status] : { label: status || 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
}

export function buildFezTrackingUrl(tracking?: string | null) {
  if (!tracking) return null;
  return `https://web.fezdelivery.co/track-delivery?tracking=${encodeURIComponent(tracking)}`;
}
