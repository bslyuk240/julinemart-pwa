// ── Supabase-native customer types ────────────────────────────────────────────

export interface CustomerProfile {
  id: string;           // uuid = auth.users.id
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  type: 'billing' | 'shipping';
  is_default: boolean;
  label: string | null;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address_1: string | null;
  address_2: string | null;
  city: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface SavedCard {
  id: string;
  customer_id: string;
  authorization_code: string;
  card_type: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  bank: string | null;
  country_code: string | null;
  email: string | null;
  is_default: boolean;
  created_at: string;
}

export interface NotificationPrefs {
  customer_id: string;
  order_updates: boolean;
  promotions: boolean;
  newsletter: boolean;
  sms: boolean;
  push: boolean;
  updated_at?: string;
}

// ── Legacy WooCommerce types (kept for order display compatibility) ────────────

export interface MetaData {
  id: number;
  key: string;
  value: any;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
