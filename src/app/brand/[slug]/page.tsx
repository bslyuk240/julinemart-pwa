import { getProductsByBrand, getBrandBySlug } from '@/lib/woocommerce/brands';
import ProductCard from '@/components/product/product-card';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Store } from 'lucide-react';

export const revalidate = 300; // Revalidate every 5 minutes

interface BrandPageProps {
  params: {
    slug: string;
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const brand = await getBrandBySlug(params.slug).catch(() => null);
  const products = brand 
    ? await getProductsByBrand(params.slug, { per_page: 24 }).catch(() => [])
    : [];

  if (!brand) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center pb-24 md:pb-8">
        <div className="text-center px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Brand Not Found</h1>
          <p className="text-gray-600 mb-6">The brand you're looking for doesn't exist.</p>
          <Link
            href="/brands"
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse All Brands
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/brands" className="hover:text-primary-600">Brands</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{brand.name}</span>
        </nav>

        {/* Brand Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Brand Logo */}
            {brand.image?.src ? (
              <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-gray-50 rounded-lg p-2">
                <Image
                  src={brand.image.src}
                  alt={brand.name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 96px, 128px"
                />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-gradient-to-br from-primary-100 to-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-4xl md:text-5xl font-bold text-primary-600">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Brand Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                {brand.name}
              </h1>
              
              {brand.description && (
                <p className="text-gray-600 mb-3 text-sm md:text-base">
                  {brand.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>{brand.count || 0} {brand.count === 1 ? 'product' : 'products'}</span>
                </div>
              </div>
            </div>

            {/* Back Button (Desktop) */}
            <Link
              href="/brands"
              className="hidden md:flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              All Brands
            </Link>
          </div>
        </div>

        {/* Back Button (Mobile) */}
        <Link
          href="/brands"
          className="md:hidden inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          All Brands
        </Link>

        {/* Products Grid */}
        {products.length > 0 ? (
          <>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
              Products from {brand.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          // Empty State
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Products Yet
              </h2>
              <p className="text-gray-600 mb-4">
                There are no products available from {brand.name} at the moment.
              </p>
              <Link
                href="/brands"
                className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Browse Other Brands
              </Link>
            </div>
          </div>
        )}

        {/* Load More (if needed) */}
        {products.length >= 24 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Showing {products.length} products
            </p>
          </div>
        )}
      </div>
    </main>
  );
}