export interface Vendor {
  id: number;
  store_name: string;
  store_url: string;
  store_slug: string;
  vendor_display_name: string;
  vendor_shop_name: string;
  vendor_email?: string;
  email?: string;
  store_email?: string;
  vendor_address?: VendorAddress;
  store_address?: string;
  address?: string;
  social?: VendorSocial;
  phone?: string;
  banner?: string;
  gravatar?: string;
  store_logo?: string;
  logo?: string;
  shop_description?: string;
  rating?: {
    rating?: string;
    count?: number;
    avg?: string;
  };
  enabled?: boolean;
  registered?: string;
  payment?: any;
  is_store_vacation?: boolean;
  vacation_message?: string;
  show_min_order_type?: string;
  store_seo?: StoreSEO;
}

export interface VendorAddress {
  street_1: string;
  street_2: string;
  city: string;
  zip: string;
  country: string;
  state: string;
}

export interface VendorSocial {
  fb?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
}

export interface StoreSEO {
  wcfmmp_store_seo_title: string;
  wcfmmp_store_seo_meta_description: string;
  wcfmmp_store_seo_meta_keywords: string;
}

export interface VendorQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  orderby?: 'registered' | 'store_name';
  order?: 'asc' | 'desc';
  status?: 'approved' | 'pending' | 'rejected';
}
