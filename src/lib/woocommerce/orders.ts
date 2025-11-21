import { wcApi, handleApiError } from './client';
import { Order, CreateOrderData, OrderStatus } from '@/types/order';

/**
 * Create a new order
 */
export async function createOrder(
  orderData: CreateOrderData
): Promise<Order | null> {
  try {
    const response = await wcApi.post('orders', orderData);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get a single order by ID
 */
export async function getOrder(id: number): Promise<Order | null> {
  try {
    const response = await wcApi.get(`orders/${id}`);
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Get orders for a customer
 */
export async function getCustomerOrders(
  customerId: number,
  params: {
    page?: number;
    per_page?: number;
    status?: OrderStatus;
  } = {}
): Promise<Order[]> {
  try {
    const response = await wcApi.get('orders', {
      customer: customerId,
      ...params,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return [];
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: number,
  status: OrderStatus
): Promise<Order | null> {
  try {
    const response = await wcApi.put(`orders/${orderId}`, { status });
    return response.data;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: number): Promise<Order | null> {
  return updateOrderStatus(orderId, 'cancelled');
}