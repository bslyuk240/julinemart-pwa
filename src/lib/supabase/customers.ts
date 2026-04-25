import { supabase } from './client';
import type { CustomerProfile, CustomerAddress, SavedCard, NotificationPrefs } from '@/types/customer';

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getCustomerProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', userId)
    .single();
  if (error || !data) return null;
  return data as CustomerProfile;
}

export async function updateCustomerProfile(
  userId: string,
  updates: Partial<Pick<CustomerProfile, 'first_name' | 'last_name' | 'phone' | 'avatar_url'>>
): Promise<CustomerProfile | null> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerProfile;
}

// ── Addresses ─────────────────────────────────────────────────────────────────

export async function getAddresses(customerId: string): Promise<CustomerAddress[]> {
  const { data } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data || []) as CustomerAddress[];
}

export async function upsertAddress(
  customerId: string,
  address: Omit<CustomerAddress, 'id' | 'customer_id' | 'created_at'>,
  id?: string
): Promise<CustomerAddress> {
  // If new default, clear existing defaults for same type first
  if (address.is_default) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .eq('type', address.type);
  }

  const payload: any = { customer_id: customerId, ...address };
  if (id) payload.id = id;

  const { data, error } = await supabase
    .from('customer_addresses')
    .upsert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as CustomerAddress;
}

export async function deleteAddress(id: string): Promise<void> {
  const { error } = await supabase.from('customer_addresses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Saved Cards ───────────────────────────────────────────────────────────────

export async function getSavedCards(customerId: string): Promise<SavedCard[]> {
  const { data } = await supabase
    .from('customer_saved_cards')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  return (data || []) as SavedCard[];
}

export async function saveCard(customerId: string, card: Omit<SavedCard, 'id' | 'customer_id' | 'created_at'>): Promise<SavedCard> {
  if (card.is_default) {
    await supabase.from('customer_saved_cards').update({ is_default: false }).eq('customer_id', customerId);
  }
  const { data, error } = await supabase
    .from('customer_saved_cards')
    .insert({ customer_id: customerId, ...card })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SavedCard;
}

export async function setDefaultCard(customerId: string, cardId: string): Promise<void> {
  await supabase.from('customer_saved_cards').update({ is_default: false }).eq('customer_id', customerId);
  const { error } = await supabase.from('customer_saved_cards').update({ is_default: true }).eq('id', cardId);
  if (error) throw new Error(error.message);
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('customer_saved_cards').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Notification Prefs ────────────────────────────────────────────────────────

export async function getNotificationPrefs(customerId: string): Promise<NotificationPrefs> {
  const { data } = await supabase
    .from('customer_notification_prefs')
    .select('*')
    .eq('customer_id', customerId)
    .single();
  return (data || {
    customer_id: customerId,
    order_updates: true,
    promotions: false,
    newsletter: false,
    sms: false,
    push: true,
  }) as NotificationPrefs;
}

export async function updateNotificationPrefs(
  customerId: string,
  prefs: Partial<Omit<NotificationPrefs, 'customer_id'>>
): Promise<void> {
  const { error } = await supabase
    .from('customer_notification_prefs')
    .upsert({ customer_id: customerId, ...prefs, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

// ── Orders (from JLO Supabase, same DB) ──────────────────────────────────────

const SUB_STATUS_RANK: Record<string, number> = {
  pending: 1,
  vendor_dispatched: 2,
  assigned: 2,
  pickup_scheduled: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

function deriveDisplayStatus(subOrders: { status: string }[], dbStatus: string): string {
  if (!subOrders.length) return dbStatus;
  const ranks = subOrders.map((so) => SUB_STATUS_RANK[so.status] ?? 1);
  if (ranks.every((r) => r === 5)) return 'delivered';
  const minRank = Math.min(...ranks);
  const rankToDisplay: Record<number, string> = {
    1: 'processing',
    2: 'ready-to-ship',
    3: 'shipped',
    4: 'out-for-delivery',
    5: 'delivered',
  };
  return rankToDisplay[minRank] ?? dbStatus;
}

export async function getCustomerOrders(email: string, limit = 10) {
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, overall_status, total_amount, created_at, sub_orders ( status )')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    overall_status: deriveDisplayStatus(o.sub_orders || [], o.overall_status),
    total_amount: o.total_amount,
    created_at: o.created_at,
  }));
}

async function countCustomerOrders(email: string, modifier?: (query: any) => any) {
  let query: any = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_email', email);

  if (modifier) {
    query = modifier(query);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getCustomerOrderSummary(email: string): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
}> {
  const [total, pending, processing, completed] = await Promise.all([
    countCustomerOrders(email, (query) => query),
    countCustomerOrders(email, (query) => query.eq('overall_status', 'pending')),
    countCustomerOrders(email, (query) => query.in('overall_status', ['processing', 'confirmed', 'packed'])),
    countCustomerOrders(email, (query) => query.eq('overall_status', 'delivered')),
  ]);

  return { total, pending, processing, completed };
}
