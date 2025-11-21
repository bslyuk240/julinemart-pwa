export interface Category {
  id: number;
  name: string;
  slug: string;
  parent: number;
  description: string;
  display: 'default' | 'products' | 'subcategories' | 'both';
  image: CategoryImage | null;
  menu_order: number;
  count: number;
  _links?: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
  };
}

export interface CategoryImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

export interface CategoryQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  order?: 'asc' | 'desc';
  orderby?: 'id' | 'include' | 'name' | 'slug' | 'term_group' | 'description' | 'count';
  hide_empty?: boolean;
  parent?: number;
  product?: number;
  slug?: string;
}