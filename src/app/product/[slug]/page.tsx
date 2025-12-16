import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductDetailPage from '@/components/product/product-detail-page';
import { getProductBySlug } from '@/lib/woocommerce/products';
import { decodeHtmlEntities } from '@/lib/utils/helpers';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://julinemart.com';
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'JulineMart';
const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || `${SITE_URL}/favicon.ico`;
const DEFAULT_DESCRIPTION = `Shop the latest products and best deals at ${SITE_NAME}.`;

type ProductPageProps = {
  params: {
    slug: string;
  };
};

const stripHtml = (value?: string | null) => (value ? value.replace(/<[^>]*>/g, '').trim() : '');

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
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
  const canonicalUrl = `${SITE_URL}/product/${params.slug}`;

  return {
    title: decodeHtmlEntities(product.name),
    description,
    openGraph: {
      title: decodeHtmlEntities(product.name),
      description,
      url: canonicalUrl,
      type: 'product',
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
  const product = await getProductBySlug(params.slug);
  if (!product) {
    notFound();
  }

  return <ProductDetailPage initialProduct={product} />;
}
