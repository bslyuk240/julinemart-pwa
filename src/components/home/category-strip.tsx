import Link from 'next/link';
import { decodeHtmlEntities } from '@/lib/utils/helpers';
import { getTopLevelCategories } from '@/lib/woocommerce/categories';
import {
  FALLBACK_CATEGORY_SLUGS,
  getCategoryVisual,
  isVisibleCategorySlug,
} from '@/lib/utils/category-display';

type StripCategory = {
  id: number;
  name: string;
  slug: string;
};

const FALLBACK_CATEGORIES: StripCategory[] = FALLBACK_CATEGORY_SLUGS.map((slug, index) => ({
  id: index + 1,
  name: slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  slug,
}));

export default async function CategoryStrip() {
  const liveCategories = await getTopLevelCategories(48);
  const categories = (liveCategories.length > 0
    ? liveCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      }))
    : FALLBACK_CATEGORIES);
  const visibleCategories = categories.filter((category) => isVisibleCategorySlug(category.slug));

  return (
    <div className="w-full bg-white py-3 md:py-4">
      <div className="container mx-auto px-4">
        <div className="mb-2 flex items-center justify-between md:mb-4">
          <h2 className="text-sm font-bold text-primary-900 md:text-lg">Shop by Category</h2>
          <Link
            href="/categories"
            className="text-xs font-medium text-secondary-500 hover:text-secondary-600 md:text-sm"
          >
            View All
          </Link>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-nowrap gap-3 pb-1 md:gap-4">
            {visibleCategories.map((category) => {
              const visual = getCategoryVisual(category.slug, category.name);
              const Icon = visual.icon;

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group flex min-w-[60px] flex-col items-center md:min-w-[72px]"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${visual.color} text-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg md:h-14 md:w-14`}
                  >
                    <Icon className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <span className="mt-1.5 text-center text-[10px] font-medium text-gray-700 transition-colors group-hover:text-primary-600 md:text-xs line-clamp-2">
                    {decodeHtmlEntities(category.name)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden flex-wrap gap-4 md:gap-6 lg:flex">
          {visibleCategories.map((category) => {
            const visual = getCategoryVisual(category.slug, category.name);
            const Icon = visual.icon;

            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex w-28 shrink-0 flex-col items-center md:w-32"
              >
                <div
                  className={`mb-2 flex h-14 w-14 items-center justify-center rounded-full ${visual.color} text-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg md:h-16 md:w-16`}
                >
                  <Icon className="h-6 w-6 md:h-7 md:w-7" />
                </div>
                <span className="text-center text-xs font-medium text-gray-700 transition-colors group-hover:text-primary-600 md:text-sm">
                  {decodeHtmlEntities(category.name)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
