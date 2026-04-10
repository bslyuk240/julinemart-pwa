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

export async function getCustomerOrders(email: string, limit = 10) {
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, overall_status, total_amount, created_at')
    .eq('customer_email', email)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
