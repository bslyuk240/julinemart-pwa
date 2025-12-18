import { getPageBySlug } from '@/lib/woocommerce/pages';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const blockedJobSlugs = [
    'job-openings',
    'sales-representative',
    'logistics-hub-coordinator',
    'virtual-assistant-customer-care-representative',
  ];

  if (blockedJobSlugs.includes(params.slug)) {
    notFound();
  }

  const page = await getPageBySlug(params.slug);

  if (!page) {
    notFound();
  }

  // Normalize internal links to open within this app (only rewrite /page/ links)
  const wpBase = process.env.NEXT_PUBLIC_WP_URL?.replace(/\/+$/, '');
  let normalizedContent = page.content;
  if (wpBase) {
    try {
      const escapedBase = wpBase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const pageLinkPattern = new RegExp(`href=(['"])${escapedBase}(/page/[^'"]+)\\1`, 'gi');
      normalizedContent = normalizedContent.replace(
        pageLinkPattern,
        'href=$1$2$1'
      );
    } catch (error) {
      console.error('Error normalizing page links', error);
    }
  }

  // Strip job links entirely to avoid showing internal job pages
  blockedJobSlugs.forEach((slug) => {
    const regex = new RegExp(`href=["'][^"']*${slug}[^"']*["']`, 'gi');
    normalizedContent = normalizedContent.replace(regex, 'href="#"');
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 md:pb-12">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Page Content */}
        <article className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Page</p>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {page.title}
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Last updated:{' '}
              {new Date(page.modified).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </header>

          <div
            className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-li:marker:text-primary-500"
            dangerouslySetInnerHTML={{ __html: normalizedContent }}
          />
        </article>
      </div>
    </main>
  );
}
