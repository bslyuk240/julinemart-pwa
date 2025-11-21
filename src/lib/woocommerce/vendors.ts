export interface Vendor {
  id: number;
  name: string;
  slug: string;
}

export async function getVendors(): Promise<Vendor[]> {
  return [];
}

export async function getVendorBySlug(slug: string): Promise<Vendor | null> {
  const vendors = await getVendors();
  return vendors.find((vendor) => vendor.slug === slug) || null;
}
