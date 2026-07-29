import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailPage from '@/components/product/product-detail-page';
import { getProductBySlug } from '@/lib/woocommerce/products';
import { decodeHtmlEntities } from '@/lib/utils/helpers';

export const revalidate = 300; // Cache product pages for 5 minutes

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://julinemart.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'JulineMart';
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || `${SITE_URL}/favicon.ico`;
const DEFAULT_DESCRIPTION = `Shop the latest products and best deals at ${SITE_NAME}.`;

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const stripHtml = (value?: string | null) => (value ? value.replace(/<[^>]*>/g, '').trim() : '');

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return {
      title: `${SITE_NAME} | Product`,
      description: DEFAULT_DESCRIPTION,
    };
  }

  const description =
    stripHtml(product.short_description) ||
    stripHtml(product.description) ||
    `${decodeHtmlEntities(product.name)} on ${SITE_NAME}`;
  const imageUrl = product.images?.[0]?.src || LOGO_URL;
  const canonicalUrl = `${SITE_URL}/product/${slug}`;

  return {
    title: decodeHtmlEntities(product.name),
    description,
    openGraph: {
      title: decodeHtmlEntities(product.name),
      description,
      url: canonicalUrl,
      type: 'website',
      images: [
        {
          url: imageUrl,
          alt: decodeHtmlEntities(product.name),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: decodeHtmlEntities(product.name),
      description,
      images: imageUrl ? [imageUrl] : [],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return <ProductDetailPage initialProduct={product} />;
}
