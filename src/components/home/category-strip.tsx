import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils/helpers';
import { getTopLevelCategories } from '@/lib/woocommerce/categories';
import {
  FALLBACK_CATEGORY_SLUGS,
  getCategoryDisplayName,
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
  name: getCategoryDisplayName(slug),
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
    // Phones (mobile tier, max-md:): Material section header, larger circles in the same colours.
    <div className="w-full bg-white py-3 max-md:bg-transparent max-md:pb-0 max-md:pt-3 md:py-4">
      <div className="container-custom min-w-0">
        <div className="mb-2 flex items-center justify-between max-md:-mr-3 max-md:mb-0 max-md:min-h-12 md:mb-4">
          <h2 className="text-sm font-bold text-primary-900 max-md:text-m-title-m max-md:text-m-on-surface md:text-lg">
            <span className="md:hidden">Shop by category</span>
            <span className="max-md:hidden">Shop by Category</span>
          </h2>
          <Link
            href="/categories"
            className="text-xs font-medium text-secondary-500 hover:text-secondary-600 max-md:flex max-md:h-12 max-md:items-center max-md:gap-0.5 max-md:px-3 max-md:text-m-label-l max-md:text-m-primary md:text-sm"
          >
            <span className="md:hidden">See all</span>
            <ChevronRight className="h-[18px] w-[18px] md:hidden" aria-hidden />
            <span className="max-md:hidden">View All</span>
          </Link>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 lg:hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex flex-nowrap gap-3 pb-1 max-md:gap-2 md:gap-4">
            {visibleCategories.map((category) => {
              const visual = getCategoryVisual(category.slug, category.name);
              const Icon = visual.icon;

              return (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="group flex min-w-[60px] flex-col items-center max-md:w-[72px] max-md:flex-none md:min-w-[72px]"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${visual.color} text-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg max-md:h-14 max-md:w-14 max-md:group-hover:scale-100 max-md:group-hover:shadow-none md:h-14 md:w-14`}
                  >
                    <Icon className="h-5 w-5 max-md:h-6 max-md:w-6 md:h-6 md:w-6" />
                  </div>
                  <span className="mt-1.5 text-center text-[10px] font-medium text-gray-700 transition-colors group-hover:text-primary-600 max-md:mt-2 max-md:text-m-label-s max-md:text-m-on-surface md:text-xs line-clamp-2">
                    {decodeHtmlEntities(category.name)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="hidden w-full lg:flex lg:flex-nowrap lg:gap-1 xl:gap-2">
          {visibleCategories.map((category) => {
            const visual = getCategoryVisual(category.slug, category.name);
            const Icon = visual.icon;

            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex min-w-0 flex-1 basis-0 flex-col items-center px-0.5"
              >
                <div
                  className={`mb-1.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${visual.color} text-white transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg xl:h-14 xl:w-14`}
                >
                  <Icon className="h-5 w-5 xl:h-6 xl:w-6" />
                </div>
                <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-gray-700 transition-colors group-hover:text-primary-600 xl:text-xs">
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
