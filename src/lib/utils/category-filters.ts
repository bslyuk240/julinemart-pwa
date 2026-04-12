import type { Product } from '@/types/product';
import { slugify } from '@/lib/utils/helpers';

const CATEGORY_ALIASES: Record<string, string[]> = {
  electronics: ['electronics', 'electronic', 'gadgets', 'phones', 'computers'],
  'fashion-accessories': ['fashion-accessories', 'fashion', 'accessories'],
  'home-living': ['home-living', 'home', 'home-decor', 'household', 'kitchen'],
  'home-items': ['home-items', 'home', 'home-decor', 'household', 'kitchen'],
  'grocery-foodstuff': ['grocery-foodstuff', 'grocery', 'foodstuff', 'groceries', 'food'],
  'beauty-personal-care': ['beauty-personal-care', 'beauty', 'personal-care', 'cosmetics'],
  'sanitary-products': ['sanitary-products', 'sanitary', 'hygiene', 'bathroom', 'care'],
  'tools-industrial': ['tools-industrial', 'tools', 'industrial', 'hardware'],
  'books-education': ['books-education', 'books', 'education'],
  'sports-fitness': ['sports-fitness', 'sports', 'fitness', 'exercise'],
  'fitness-equipment': ['fitness-equipment', 'sports', 'fitness', 'exercise'],
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
