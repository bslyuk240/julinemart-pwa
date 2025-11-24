import { getBrands } from '@/lib/woocommerce/brands';
import Link from 'next/link';
import Image from 'next/image';
import { Store, ArrowLeft } from 'lucide-react';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function BrandsPage() {
  const brands = await getBrands({
    per_page: 100,
    hide_empty: true,
    orderby: 'name',
    order: 'asc',
  });

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-2 rounded-lg shadow-md">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              All Brands
            </h1>
          </div>
          <p className="text-gray-600">
            Browse products from {brands.length} trusted brands
          </p>
        </div>

        {/* Brands Grid */}
        {brands.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brand/${brand.slug}`}
                className="group"
              >
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-primary-400 hover:shadow-lg transition-all duration-200">
                  {/* Brand Logo or Initial */}
                  {brand.image ? (
                    <div className="relative aspect-square w-full mb-3">
                      <Image
                        src={brand.image.src}
                        alt={brand.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square w-full bg-gradient-to-br from-primary-50 to-purple-50 rounded-lg flex items-center justify-center mb-3">
                      <span className="text-3xl font-bold text-primary-600">
                        {brand.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Brand Name */}
                  <h3 className="font-semibold text-gray-900 text-center mb-1 truncate group-hover:text-primary-600 transition-colors">
                    {brand.name}
                  </h3>
                  
                  {/* Product Count */}
                  <p className="text-xs text-gray-500 text-center">
                    {brand.count} {brand.count === 1 ? 'product' : 'products'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Empty State
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Brands Found
              </h2>
              <p className="text-gray-600 mb-4">
                There are no brands available at the moment.
              </p>
              <Link
                href="/"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}

        {/* Brand Count Info */}
        {brands.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Showing all {brands.length} brands
            </p>
          </div>
        )}
      </div>
    </main>
  );
}