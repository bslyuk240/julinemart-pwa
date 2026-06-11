import Link from 'next/link';
import { decodeHtmlEntities } from '@/lib/utils/helpers';
import { getTopLevelCategories } from '@/lib/woocommerce/categories';
import {
  FALLBACK_CATEGORY_SLUGS,
  getCategoryVisual,
  isVisibleCategorySlug,
} from '@/lib/utils/category-display';

type CategoryCard = {
  id: number;
  name: string;
  slug: string;
  count: number;
};

const FALLBACK_CATEGORIES: CategoryCard[] = FALLBACK_CATEGORY_SLUGS.map((slug, index) => ({
  id: index + 1,
  name: slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  slug,
  count: 0,
}));

export default async function CategoriesPage() {
  const liveCategories = await getTopLevelCategories(48);
  const categories = (liveCategories.length > 0
    ? liveCategories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.count ?? 0,
      }))
    : FALLBACK_CATEGORIES
  )
    .filter((category) => isVisibleCategorySlug(category.slug))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 md:py-6">
        <div className="mb-4 md:mb-6">
          <h1 className="mb-1 text-base font-bold text-gray-900 md:text-xl">Shop by Category</h1>
          <p className="text-xs text-gray-600 md:text-sm">
            Browse all {categories.length} product categories
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:hidden lg:grid lg:grid-cols-4 lg:gap-3">
          {categories.map((category) => {
            const visual = getCategoryVisual(category.slug, category.name);
            const Icon = visual.icon;

            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group overflow-hidden rounded-lg bg-white shadow-sm transition-all duration-200 hover:shadow-lg"
              >
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundImage: `url(${visual.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                  <div className="absolute bottom-3 left-3">
                    <div className={`${visual.color} rounded-lg p-2`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>

                <div className="p-3 md:p-4">
                  <h3 className="mb-1 leading-snug font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
                    {decodeHtmlEntities(category.name)}
                  </h3>
                  <p className="text-xs text-gray-600 md:text-sm">
                    {category.count > 0 ? `${category.count} products` : 'Browse products'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="hidden -mx-4 md:block lg:hidden">
          <div className="overflow-x-auto px-4">
            <div className="flex min-w-max gap-3">
              {categories.map((category) => {
                const visual = getCategoryVisual(category.slug, category.name);
                const Icon = visual.icon;

                return (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                className="group flex w-28 shrink-0 flex-col items-center gap-2 md:w-32"
                  >
                    <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gray-100 shadow-md transition-shadow group-hover:shadow-lg">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-300 group-hover:scale-110"
                        style={{ backgroundImage: `url(${visual.image})` }}
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`${visual.color} rounded-full p-2`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-xs font-semibold leading-tight text-gray-900">
                      {decodeHtmlEntities(category.name)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white md:p-8">
          <h2 className="mb-2 text-2xl font-bold">Can't find what you're looking for?</h2>
          <p className="mb-4 text-primary-100">Use our search to find specific products</p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-white px-6 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
