import { wcApi, handleApiError } from './client';

/**
 * WooCommerce Refund Management
 * All refund data stored in WooCommerce - no Supabase needed
 */

// ============ TYPES ============

export interface RefundLineItem {
  id: number;
  quantity: number;
  refund_total?: string;
}

export interface CreateRefundData {
  amount: string;
  reason?: string;
  refunded_by?: number;
  meta_data?: Array<{ key: string; value: string }>;
  line_items?: RefundLineItem[];
  api_refund?: boolean;
  api_restock?: boolean;
}

export interface WooRefund {
  id: number;
  date_created: string;
  date_created_gmt: string;
  amount: string;
  reason: string;
  refunded_by: number;
  refunded_payment: boolean;
  meta_data: Array<{ id: number; key: string; value: string }>;
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    subtotal: string;
    total: string;
    sku: string;
    price: number;
  }>;
}

export interface RefundRequestMeta {
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  reason: string;
  requested_amount?: number;
  requested_at: string;
  line_items?: Array<{
    id: number;
    quantity: number;
    refund_total?: number;
    name?: string;
  }>;
  customer_email: string;
  customer_name: string;
  admin_notes?: string;
  rejection_reason?: string;
  processed_at?: string;
}

export interface ReturnShipmentMeta {
  method: 'pickup' | 'dropoff';
  return_code: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'completed';
  fez_tracking?: string | null;
  created_at: string;
}

// ============ REFUND API FUNCTIONS ============

/**
 * Create a refund in WooCommerce
 */
export async function createWooRefund(
  orderId: number,
  refundData: CreateRefundData
): Promise<WooRefund | null> {
  try {
    const response = await wcApi.post(`orders/${orderId}/refunds`, {
      ...refundData,
      api_refund: refundData.api_refund ?? false,
      api_restock: refundData.api_restock ?? true,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get all refunds for an order
 */
export async function getOrderRefunds(orderId: number): Promise<WooRefund[]> {
  try {
    const response = await wcApi.get(`orders/${orderId}/refunds`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Get a single refund
 */
export async function getRefund(
  orderId: number,
  refundId: number
): Promise<WooRefund | null> {
  try {
    const response = await wcApi.get(`orders/${orderId}/refunds/${refundId}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get total refunded amount for an order
 */
export async function getTotalRefundedAmount(orderId: number): Promise<number> {
  const refunds = await getOrderRefunds(orderId);
  return refunds.reduce((total, refund) => total + parseFloat(refund.amount), 0);
}

// ============ REFUND REQUEST FUNCTIONS (Order Meta) ============

/**
 * Submit a refund request (stores in order meta + adds order note)
 */
export async function submitRefundRequest(
  orderId: number,
  data: {
    reason: string;
    amount: number;
    customerEmail: string;
    customerName: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const refundRequest: RefundRequestMeta = {
      status: 'pending',
      reason: data.reason,
      requested_amount: data.amount,
      requested_at: new Date().toISOString(),
      customer_email: data.customerEmail,
      customer_name: data.customerName,
    };

    // Update order with refund request meta
    const response = await wcApi.put(`orders/${orderId}`, {
      meta_data: [
        {
          key: '_refund_request',
          value: JSON.stringify(refundRequest),
        },
        {
          key: '_refund_request_status',
          value: 'pending',
        },
      ],
    });

    if (!response.data) {
      throw new Error('Failed to update order');
    }

    // Add order note for visibility in WooCommerce admin
    await addOrderNote(orderId, 
      `🔄 REFUND REQUEST SUBMITTED\n` +
      `Amount: ₦${data.amount.toLocaleString()}\n` +
      `Reason: ${data.reason}\n` +
      `Customer: ${data.customerName} (${data.customerEmail})`
    );

    return {
      success: true,
      message: 'Refund request submitted successfully',
    };
  } catch (error) {
    handleApiError(error);
    return {
      success: false,
      message: 'Failed to submit refund request',
    };
  }
}

/**
 * Get refund request status from order meta
 */
export async function getRefundRequestStatus(
  orderId: number
): Promise<RefundRequestMeta | null> {
  try {
    const response = await wcApi.get(`orders/${orderId}`);
    const order = response.data;

    const refundRequestMeta = order.meta_data?.find(
      (m: any) => m.key === '_refund_request'
    );

    if (refundRequestMeta?.value) {
      return JSON.parse(refundRequestMeta.value);
    }

    return null;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Add a note to an order
 */
export async function addOrderNote(
  orderId: number,
  note: string,
  customerNote: boolean = false
): Promise<boolean> {
  try {
    await wcApi.post(`orders/${orderId}/notes`, {
      note,
      customer_note: customerNote,
    });
    return true;
  } catch (error) {
    handleApiError(error);
    return false;
  }
}

// ============ ELIGIBILITY HELPERS ============

/**
 * Check if order is eligible for refund
 */
export function isOrderEligibleForRefund(
  orderDate: string,
  refundWindowDays: number = 14
): { eligible: boolean; daysRemaining: number; reason?: string } {
  const orderDateTime = new Date(orderDate);
  const now = new Date();
  const diffTime = now.getTime() - orderDateTime.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const daysRemaining = refundWindowDays - diffDays;

  if (diffDays > refundWindowDays) {
    return {
      eligible: false,
      daysRemaining: 0,
      reason: `Refund window of ${refundWindowDays} days has expired`,
    };
  }

  return {
    eligible: true,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Check if order status allows refund
 */
export function canOrderBeRefunded(status: string): boolean {
  // Refunds allowed only after delivery/completion
  const refundableStatuses = ['delivered', 'completed'];
  return refundableStatuses.includes(status);
}

/**
 * Format refund request status for display
 */
export function formatRefundStatus(status: RefundRequestMeta['status']): {
  label: string;
  color: string;
  bgColor: string;
} {
  const statusMap = {
    pending: { label: 'Pending Review', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    approved: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
    processed: { label: 'Refunded', color: 'text-green-700', bgColor: 'bg-green-100' },
  };

  return statusMap[status] || { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
}
