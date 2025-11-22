export interface Order {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: OrderStatus;
  currency: string;
  date_created: string;
  date_modified: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: BillingAddress;
  shipping: ShippingAddress;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string | null;
  date_completed: string | null;
  cart_hash: string;
  line_items: OrderLineItem[];
  tax_lines: TaxLine[];
  shipping_lines: ShippingLine[];
  fee_lines: any[];
  coupon_lines: CouponLine[];
  refunds: any[];
  meta_data: MetaData[];
}

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'failed'
  | 'trash';

export interface BillingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

export interface ShippingAddress {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface OrderLineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: MetaData[];
  sku: string;
  price: number;
  image: {
    id: string;
    src: string;
  };
}

export interface TaxLine {
  id: number;
  rate_code: string;
  rate_id: number;
  label: string;
  compound: boolean;
  tax_total: string;
  shipping_tax_total: string;
  meta_data: any[];
}

export interface ShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  total: string;
  total_tax: string;
  taxes: any[];
  meta_data: any[];
}

export interface CouponLine {
  id: number;
  code: string;
  discount: string;
  discount_tax: string;
  meta_data: any[];
}

export interface MetaData {
  id: number;
  key: string;
  value: any;
}

export interface CreateOrderData {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  billing: BillingAddress;
  shipping: ShippingAddress;
  line_items: {
    product_id: number;
    quantity: number;
    variation_id?: number;
    meta_data?: {  // ← Add this
      key: string;
      value: any;
    }[];
  }[];
  shipping_lines?: {
    method_id: string;
    method_title: string;
    total: string;
  }[];
  customer_note?: string;
}