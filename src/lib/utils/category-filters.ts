import type { Product } from '@/types/product';
import { slugify } from '@/lib/utils/helpers';

const CATEGORY_ALIASES: Record<string, string[]> = {
  electronics: ['electronics', 'phones', 'computers', 'gadgets', 'appliances'],
  'fashion-accessories': ['fashion-accessories', 'fashion', 'accessories', 'clothing', 'apparel'],
  'home-living': ['home-living', 'home', 'household', 'kitchen'],
  'grocery-foodstuff': ['grocery-foodstuff', 'grocery', 'foodstuff', 'groceries', 'food'],
  'beauty-personal-care': ['beauty-personal-care', 'beauty', 'personal-care', 'cosmetics'],
  'tools-industrial': ['tools-industrial', 'tools', 'industrial', 'hardware'],
  'books-education': ['books-education', 'books', 'education'],
  'sports-fitness': ['sports-fitness', 'sports', 'fitness', 'exercise'],
  'baby-kids-toys': ['baby-kids-toys', 'baby', 'kids', 'toys', 'children'],
  'digital-products': ['digital-products', 'digital'],
};

function buildCandidates(categorySlug: string) {
  const base = slugify(categorySlug);
  const aliases = CATEGORY_ALIASES[base] ?? [];
  return new Set([base, ...aliases.map(slugify)]);
}

export function productMatchesCategory(product: Product, categorySlug: string): boolean {
  const candidates = buildCandidates(categorySlug);

  return (product.categories ?? []).some((category) => {
    const normalizedSlug = slugify(category.slug);
    const normalizedName = slugify(category.name);
    return candidates.has(normalizedSlug) || candidates.has(normalizedName);
  });
}

export function filterProductsByCategory(products: Product[], categorySlug: string): Product[] {
  return products.filter((product) => productMatchesCategory(product, categorySlug));
}
