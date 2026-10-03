const RAW_JLO_BASE =
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_URL ||
  'https://jlo.julinemart.com';

export type JloReturnShipment = {
  return_shipment_id: string;
  return_request_id: string;
  return_code: string | null;
  tracking_number: string | null;
  status: string;
  tracking_submitted_at?: string | null;
};

export type JloReturnPickup = {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  preferred_date: string | null;
  notes: string | null;
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
  refund_initiated_at?: string;
  refund_expected_by?: string;
};

export type ResolutionTimelineEntry = {
  at: string;
  stage: string;
  label: string;
  actor?: string;
};

export type JloReturn = {
  return_request_id: string;
  return_shipment_id: string;
  return_code: string | null;
  tracking_number?: string | null;
  order_id: number;
  order_number?: string;
  preferred_resolution?: 'refund' | 'replacement';
  reason_code?: string;
  complaint_type?: string;
  reason_note?: string;
  images?: string[];
  resolution_timeline?: ResolutionTimelineEntry[];
  status: string;
  created_at?: string;
  /** 'pickup' (we collect it) or 'dropoff' (the customer takes it to a Fez location). */
  method?: 'pickup' | 'dropoff';
  pickup?: JloReturnPickup | null;
  /** What the customer owes for the pickup; 0 when it's our fault. Deducted from the refund. */
  pickup_fee?: number;
  pickup_lane?: 'fez' | 'local_rider' | null;
  return_shipment?: JloReturnShipment;
  line_items?: JloReturnLineItem[];
} & JloRefundInfo;

export function getJloBaseUrl() {
  return RAW_JLO_BASE.replace(/\/$/, '');
}

export function formatJloReturnStatus(
  status: string | undefined
): { label: string; color: string; bgColor: string } {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    requested: { label: 'Requested', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    pending_review: { label: 'Under review', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    awaiting_pickup: { label: 'Pickup scheduled', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    awaiting_dropoff: { label: 'Awaiting drop-off', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    awaiting_tracking: { label: 'Awaiting Tracking', color: 'text-gray-700', bgColor: 'bg-gray-100' },
    in_transit: { label: 'In Transit', color: 'text-purple-700', bgColor: 'bg-purple-100' },
    delivered_to_hub: { label: 'At Hub', color: 'text-teal-700', bgColor: 'bg-teal-100' },
    inspection_in_progress: { label: 'Inspection', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    approved: { label: 'Approved', color: 'text-green-700', bgColor: 'bg-green-100' },
    rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
    refund_processing: { label: 'Refund Processing', color: 'text-sky-700', bgColor: 'bg-sky-100' },
    refund_completed: { label: 'Refund Completed', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    refund_failed: { label: 'Refund Failed', color: 'text-red-700', bgColor: 'bg-red-100' },
  };

  return map[status || ''] || { label: status || 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100' };
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

  return map[status || 'none'];
}

export function buildFezTrackingUrl(tracking?: string | null) {
  if (!tracking) return null;
  return `https://web.fezdelivery.co/track-delivery?tracking=${encodeURIComponent(tracking)}`;
}
