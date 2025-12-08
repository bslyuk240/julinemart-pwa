import Link from 'next/link';
import { 
  Shirt, 
  Car, 
  Tv, 
  Home as HomeIcon, 
  ShoppingCart,
  Sparkles,
  Wrench,
  BookOpen,
  Dumbbell,
  Baby,
  Laptop
} from 'lucide-react';
import { decodeHtmlEntities } from '@/lib/utils/helpers';

const categories = [
  { 
    id: 1, 
    name: 'Fashion & Accessories', 
    slug: 'fashion-accessories', 
    icon: Shirt,
    count: 0, // Will be updated when fetched from API
    color: 'bg-pink-500',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400'
  },
  { 
    id: 2, 
    name: 'Automotive', 
    slug: 'automotive', 
    icon: Car,
    count: 0,
    color: 'bg-red-500',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400'
  },
  { 
    id: 3, 
    name: 'Electronics', 
    slug: 'electronics', 
    icon: Tv,
    count: 0,
    color: 'bg-blue-500',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400'
  },
  { 
    id: 4, 
    name: 'Home & Living', 
    slug: 'home-living', 
    icon: HomeIcon,
    count: 0,
    color: 'bg-green-500',
    image: 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=400'
  },
  { 
    id: 5, 
    name: 'Grocery & Foodstuff', 
    slug: 'grocery-foodstuff', 
    icon: ShoppingCart,
    count: 0,
    color: 'bg-orange-500',
    image: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=400'
  },
  { 
    id: 6, 
    name: 'Beauty & Personal Care', 
    slug: 'beauty-personal-care', 
    icon: Sparkles,
    count: 0,
    color: 'bg-purple-500',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400'
  },
  { 
    id: 7, 
    name: 'Tools & Industrial', 
    slug: 'tools-industrial', 
    icon: Wrench,
    count: 0,
    color: 'bg-gray-700',
    image: 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=400'
  },
  { 
    id: 8, 
    name: 'Books & Education', 
    slug: 'books-education', 
    icon: BookOpen,
    count: 0,
    color: 'bg-amber-500',
    image: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400'
  },
  { 
    id: 9, 
    name: 'Sports & Fitness', 
    slug: 'sports-fitness', 
    icon: Dumbbell,
    count: 0,
    color: 'bg-teal-500',
    image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=400'
  },
  { 
    id: 10, 
    name: 'Baby, Kids & Toys', 
    slug: 'baby-kids-toys', 
    icon: Baby,
    count: 0,
    color: 'bg-yellow-500',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400'
  },
  { 
    id: 11, 
    name: 'Digital Products', 
    slug: 'digital-products', 
    icon: Laptop,
    count: 0,
    color: 'bg-indigo-500',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400'
  },
];

export default function CategoriesPage() {
  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Shop by Category</h1>
          <p className="text-sm md:text-base text-gray-600">Browse all {categories.length} product categories</p>
        </div>

        {/* Categories Grid - mobile & desktop */}
        <div className="grid grid-cols-2 gap-2 md:hidden lg:grid lg:grid-cols-4 lg:gap-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Category Image */}
                <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundImage: `url(${category.image})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  
                  {/* Icon */}
                  <div className="absolute bottom-3 left-3">
                    <div className={`${category.color} p-2 rounded-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Category Info */}
                <div className="p-3 md:p-4">
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors leading-snug">
                    {decodeHtmlEntities(category.name)}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">Browse products</p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Tablet horizontal scroller */}
        <div className="hidden md:block lg:hidden -mx-4">
          <div className="overflow-x-auto px-4">
            <div className="flex gap-3 min-w-max">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="flex flex-col items-center gap-2 group shrink-0 w-28"
                  >
                    <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-md bg-gray-100 group-hover:shadow-lg transition-shadow">
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:scale-110 transition-transform duration-300"
                        style={{ backgroundImage: `url(${category.image})` }}
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`${category.color} p-2 rounded-full`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-xs font-semibold text-gray-900 leading-tight">
                      {decodeHtmlEntities(category.name)}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Popular Categories Banner */}
        <div className="mt-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-6 md:p-8 text-white">
          <h2 className="text-2xl font-bold mb-2">Can't find what you're looking for?</h2>
          <p className="text-primary-100 mb-4">Use our search to find specific products</p>
          <Link
            href="/"
            className="inline-block bg-white text-primary-600 font-semibold px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
