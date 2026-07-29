import {
  Baby,
  BookOpen,
  Car,
  Dumbbell,
  Home as HomeIcon,
  Laptop,
  LucideIcon,
  Shirt,
  ShoppingCart,
  Sparkles,
  Tv,
  Wrench,
} from 'lucide-react';
import { decodeHtmlEntities, slugify } from '@/lib/utils/helpers';

export type CategoryVisual = {
  icon: LucideIcon;
  color: string;
  image: string;
};

type CategoryDefinition = {
  slug: string;
  name: string;
  visual: CategoryVisual;
};

const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    slug: 'fashion-accessories',
    name: 'Fashion & Accessories',
    visual: {
      icon: Shirt,
      color: 'bg-pink-500',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
    },
  },
  {
    slug: 'automotive',
    name: 'Automotive',
    visual: {
      icon: Car,
      color: 'bg-red-500',
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400',
    },
  },
  {
    slug: 'electronics',
    name: 'Electronics',
    visual: {
      icon: Tv,
      color: 'bg-blue-500',
      image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400',
    },
  },
  {
    slug: 'home-living',
    name: 'Home and Living',
    visual: {
      icon: HomeIcon,
      color: 'bg-green-500',
      image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400',
    },
  },
  {
    slug: 'grocery-foodstuff',
    name: 'Grocery & Foodstuff',
    visual: {
      icon: ShoppingCart,
      color: 'bg-orange-500',
      image: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=400',
    },
  },
  {
    slug: 'beauty-personal-care',
    name: 'Beauty & Personal Care',
    visual: {
      icon: Sparkles,
      color: 'bg-purple-500',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    },
  },
  {
    slug: 'tools-industrial',
    name: 'Tools Industrial',
    visual: {
      icon: Wrench,
      color: 'bg-gray-700',
      image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400',
    },
  },
  {
    slug: 'books-education',
    name: 'Books Education',
    visual: {
      icon: BookOpen,
      color: 'bg-amber-500',
      image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
    },
  },
  {
    slug: 'sports-fitness',
    name: 'Sports Fitness',
    visual: {
      icon: Dumbbell,
      color: 'bg-teal-500',
      image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400',
    },
  },
  {
    slug: 'baby-kids-toys',
    name: 'Baby Kids Toys',
    visual: {
      icon: Baby,
      color: 'bg-yellow-500',
      image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400',
    },
  },
  {
    slug: 'digital-products',
    name: 'Digital Products',
    visual: {
      icon: Laptop,
      color: 'bg-indigo-500',
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400',
    },
  },
];

const CATEGORY_VISUALS = new Map<string, CategoryVisual>();

/** Extra slug keys from WooCommerce / CMS that should map to the same visual */
const CATEGORY_SLUG_ALIASES: Record<string, string> = {
  'home-and-living': 'home-living',
  'sports-and-fitness': 'sports-fitness',
  'tools-and-industrial': 'tools-industrial',
  fashion: 'fashion-accessories',
  grocery: 'grocery-foodstuff',
  beauty: 'beauty-personal-care',
};

for (const definition of CATEGORY_DEFINITIONS) {
  CATEGORY_VISUALS.set(slugify(definition.slug), definition.visual);
  CATEGORY_VISUALS.set(slugify(definition.name), definition.visual);
}

for (const [alias, target] of Object.entries(CATEGORY_SLUG_ALIASES)) {
  const visual = CATEGORY_VISUALS.get(target);
  if (visual) CATEGORY_VISUALS.set(alias, visual);
}

const FALLBACK_VISUAL: CategoryVisual = {
  icon: ShoppingCart,
  color: 'bg-primary-600',
  image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400',
};

export function getCategoryVisual(slug: string, name?: string): CategoryVisual {
  const raw = [slug, name].filter(Boolean) as string[];
  const candidates = raw.map((value) => slugify(decodeHtmlEntities(value)));

  for (const candidate of candidates) {
    const visual = CATEGORY_VISUALS.get(candidate);
    if (visual) return visual;
  }

  return FALLBACK_VISUAL;
}

const CATEGORY_NAMES = new Map<string, string>();
for (const definition of CATEGORY_DEFINITIONS) {
  CATEGORY_NAMES.set(slugify(definition.slug), definition.name);
}

/** Known display name for a category slug, falling back to a humanized version of the slug. */
export function getCategoryDisplayName(slug: string): string {
  const known = CATEGORY_NAMES.get(slugify(decodeHtmlEntities(slug)));
  if (known) return known;

  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const FALLBACK_CATEGORY_SLUGS = CATEGORY_DEFINITIONS.map((definition) => definition.slug);

export const HIDDEN_CATEGORY_SLUGS = ['uncategorized', 'wedasi', 'weidasi'];

export function isVisibleCategorySlug(slug: string): boolean {
  return !HIDDEN_CATEGORY_SLUGS.includes(slug.toLowerCase());
}
