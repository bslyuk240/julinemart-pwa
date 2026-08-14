export type GiftFulfilmentCentre = {
  id: string;
  code: string;
  name: string;
  city: string;
  state: string;
};

export type GiftBoxContent = {
  product_id: string;
  name: string;
  quantity: number;
  image: string | null;
};

export type GiftBox = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  list_price: number;
  recipient_types: string[];
  occasion_types: string[];
  item_count: number;
  contents: GiftBoxContent[];
};

export type GiftCheckoutPayload = {
  gift_box_slug?: string;
  builder_session_token?: string;
  gfc_code?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string;
  recipient_address: string;
  recipient_city: string;
  recipient_state: string;
  recipient_zone: string;
  gift_message?: string;
  sender_visible?: boolean;
  occasion?: string;
  shipping_fee?: number;
};

export type GiftPackagingOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  max_items: number;
};

export type GiftBuilderItem = {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  name?: string;
  gift_category?: string | null;
  image?: string | null;
};

export type GiftBuilderState = {
  session_token: string;
  items: GiftBuilderItem[];
  packaging: GiftPackagingOption | null;
  packaging_options: GiftPackagingOption[];
  totals: {
    items_subtotal: number;
    packaging_fee: number;
    grand_total: number;
    item_count: number;
  };
  session: {
    recipient_type?: string | null;
    occasion?: string | null;
    budget_max?: number | null;
  };
};
