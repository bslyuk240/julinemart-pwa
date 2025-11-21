'use client';

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

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: React.ReactNode;
  color: string;
}

const defaultCategories: Category[] = [
  { id: 1, name: 'Fashion', slug: 'fashion-accessories', icon: <Shirt />, color: 'bg-pink-500' },
  { id: 2, name: 'Automotive', slug: 'automotive', icon: <Car />, color: 'bg-red-500' },
  { id: 3, name: 'Electronics', slug: 'electronics', icon: <Tv />, color: 'bg-blue-500' },
  { id: 4, name: 'Home & Living', slug: 'home-living', icon: <HomeIcon />, color: 'bg-green-500' },
  { id: 5, name: 'Grocery', slug: 'grocery-foodstuff', icon: <ShoppingCart />, color: 'bg-orange-500' },
  { id: 6, name: 'Beauty', slug: 'beauty-personal-care', icon: <Sparkles />, color: 'bg-purple-500' },
  { id: 7, name: 'Tools', slug: 'tools-industrial', icon: <Wrench />, color: 'bg-gray-700' },
  { id: 8, name: 'Books', slug: 'books-education', icon: <BookOpen />, color: 'bg-amber-500' },
  { id: 9, name: 'Sports', slug: 'sports-fitness', icon: <Dumbbell />, color: 'bg-teal-500' },
  { id: 10, name: 'Baby & Kids', slug: 'baby-kids-toys', icon: <Baby />, color: 'bg-yellow-500' },
  { id: 11, name: 'Digital', slug: 'digital-products', icon: <Laptop />, color: 'bg-indigo-500' },
];

export default function CategoryStrip({ categories = defaultCategories }: { categories?: Category[] }) {
  return (
    <div className="w-full bg-white py-4 md:py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg md:text-xl font-bold text-primary-900">Shop by Category</h2>
          <Link 
            href="/categories" 
            className="text-sm text-secondary-500 hover:text-secondary-600 font-medium"
          >
            View All
          </Link>
        </div>

        {/* Horizontal Scrollable Category List */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 md:gap-6 pb-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex flex-col items-center group min-w-[70px] md:min-w-[80px]"
              >
                {/* Icon Circle */}
                <div className={`
                  w-14 h-14 md:w-16 md:h-16 rounded-full ${category.color} 
                  flex items-center justify-center text-white mb-2
                  transform transition-all duration-200 
                  group-hover:scale-110 group-hover:shadow-lg
                `}>
                  <div className="w-6 h-6 md:w-7 md:h-7">
                    {category.icon}
                  </div>
                </div>

                {/* Category Name */}
                <span className="text-xs md:text-sm font-medium text-gray-700 group-hover:text-primary-600 text-center transition-colors">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}