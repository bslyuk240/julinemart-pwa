import { NextResponse } from 'next/server';
import { catalogGetProducts, catalogGetTagsAudit } from '@/lib/catalog/client';
import { PRODUCT_TAGS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const TARGET_TAGS = [
  PRODUCT_TAGS.FLASH_SALE,
  PRODUCT_TAGS.DEAL,
  PRODUCT_TAGS.BEST_SELLER,
];

export async function GET() {
  const results: {
    timestamp: string;
    source: string;
    environment: Record<string, string>;
    tests: Array<Record<string, unknown>>;
    summary?: Record<string, number>;
  } = {
    timestamp: new Date().toISOString(),
    source: 'supabase-catalog',
    environment: {
      JLO_CATALOG_URL: process.env.NEXT_PUBLIC_JLO_CATALOG_URL ? 'SET' : 'NOT SET',
      JLO_API_BASE_URL: process.env.JLO_API_BASE_URL ? 'SET' : 'NOT SET',
    },
    tests: [],
  };

  try {
    const tags = (await catalogGetTagsAudit()) ?? [];
    results.tests.push({
      name: 'Fetch tag audit',
      status: 'success',
      count: tags.length,
      tags: tags.slice(0, 20).map((t) => ({
        slug: t.slug,
        name: t.name,
        count: t.product_count,
      })),
    });

    const found = TARGET_TAGS.map((slug) => {
      const tag = tags.find((t) => t.slug === slug);
      return tag
        ? { slug, name: tag.name, count: tag.product_count }
        : { slug, missing: true };
    });

    results.tests.push({
      name: 'Check target tags',
      status: 'success',
      targetTags: TARGET_TAGS,
      found,
    });

    const productResults = [];
    for (const slug of TARGET_TAGS) {
      const products = await catalogGetProducts({ tag: slug, per_page: 10 });
      productResults.push({
        tag: slug,
        success: true,
        count: products?.length ?? 0,
        products: (products ?? []).slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
        })),
      });
    }

    results.tests.push({
      name: 'Fetch products by tag',
      status: 'success',
      results: productResults,
    });

    results.summary = {
      totalTags: tags.length,
      targetTagsFound: found.filter((f) => !('missing' in f)).length,
      productsFound: productResults.reduce((sum, r) => sum + r.count, 0),
    };

    return NextResponse.json(results, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: true,
        message,
        environment: results.environment,
      },
      { status: 500 }
    );
  }
}
