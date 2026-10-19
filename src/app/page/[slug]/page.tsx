import { getPageBySlug } from '@/lib/supabase/static-pages';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { clsx } from 'clsx';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';
import { getMobileTierRoute } from '@/lib/mobile/mobile-tier-routes';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const vendorPortalUrl = (
    process.env.NEXT_PUBLIC_VENDOR_URL?.replace(/\/+$/, '') || 'https://vendors.julinemart.com'
  );
  const blockedJobSlugs = [
    'job-openings',
    'sales-representative',
    'logistics-hub-coordinator',
    'virtual-assistant-customer-care-representative',
  ];

  if (blockedJobSlugs.includes(slug)) {
    notFound();
  }

  const page = await getPageBySlug(slug);

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

  if (slug === 'become-a-vendor') {
    try {
      const vendorApplyNowPattern = new RegExp(
        `href=(['"])https://admin\\.julinemart\\.com/vendor-register/?\\1`,
        'gi'
      );
      normalizedContent = normalizedContent.replace(
        vendorApplyNowPattern,
        `href=$1${vendorPortalUrl}$1`
      );
    } catch (error) {
      console.error('Error normalizing vendor application link', error);
    }
  }

  // WordPress section titles arrive as <p><strong>Title</strong></p>. Promote them to <h2> so screen readers can jump
  // between sections; the inner <strong> keeps the look identical where no heading styles apply.
  normalizedContent = normalizedContent.replace(/<p>\s*(<strong>[^<]+<\/strong>)\s*<\/p>/gi, '<h2>$1</h2>');

  // Strip job links entirely to avoid showing internal job pages
  blockedJobSlugs.forEach((slug) => {
    const regex = new RegExp(`href=["'][^"']*${slug}[^"']*["']`, 'gi');
    normalizedContent = normalizedContent.replace(regex, 'href="#"');
  });

  // Mobile tier (docs/mobile-tier-plan.md, M12): top bar carries the title; the article reads edge to edge below md.
  const tier = getMobileTierRoute(`/page/${slug}`) !== null;
  const updated = new Date(page.modified);

  return (
    <main className={clsx('min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 md:pb-12', tier && 'max-md:bg-none max-md:bg-m-surface max-md:pb-6')}>
      {tier && (
        <div className="sticky top-0 z-m-header bg-m-surface md:hidden">
          <MobileTopBar
            title={page.title}
            subtitle={
              Number.isNaN(updated.getTime())
                ? undefined
                : `Updated ${updated.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`
            }
            backHref="/"
          />
        </div>
      )}
      <div className={clsx('container mx-auto px-4 py-6 max-w-4xl', tier && 'max-md:px-4 max-md:py-2')}>
        {/* Back Button */}
        <div className={clsx('flex items-center justify-between mb-6', tier && 'max-md:hidden')}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Page Content */}
        <article className={clsx('bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8', tier && 'max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none')}>
          <header className={clsx('mb-6', tier && 'max-md:hidden')}>
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
            className={clsx('prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-ul:list-disc prose-li:marker:text-primary-500', tier && 'm-article')}
            dangerouslySetInnerHTML={{ __html: normalizedContent }}
          />
        </article>
      </div>
    </main>
  );
}
