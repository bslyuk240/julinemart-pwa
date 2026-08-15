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
  try {
    const allTags = (await catalogGetTagsAudit()) ?? [];
    const foundTags = allTags.filter((tag) => TARGET_TAGS.includes(tag.slug));

    const productsByTag = await Promise.all(
      TARGET_TAGS.map(async (tagSlug) => {
        try {
          const products = await catalogGetProducts({ tag: tagSlug, per_page: 10 });
          return {
            tag: tagSlug,
            success: true,
            count: products?.length ?? 0,
            products: (products ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
            })),
          };
        } catch (error: unknown) {
          return {
            tag: tagSlug,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            count: 0,
            products: [],
          };
        }
      })
    );

    const recommendations: string[] = [];
    productsByTag.forEach((result) => {
      if (!result.success) {
        recommendations.push(`Tag "${result.tag}" failed: ${result.error}`);
      } else if (result.count === 0) {
        const exists = foundTags.find((t) => t.slug === result.tag);
        recommendations.push(
          exists
            ? `Tag "${result.tag}" exists but has no published catalog products.`
            : `Tag "${result.tag}" is missing — add it in JLO catalog meta.`
        );
      } else {
        recommendations.push(`Tag "${result.tag}" OK (${result.count} products).`);
      }
    });

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        source: 'supabase-catalog',
        summary: {
          totalTags: allTags.length,
          foundTargetTags: foundTags.length,
          expectedTags: TARGET_TAGS.length,
        },
        tags: {
          target: foundTags.map((t) => ({
            slug: t.slug,
            name: t.name,
            count: t.product_count,
          })),
        },
        productsByTag,
        recommendations,
      },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : String(error),
        recommendations: [
          'Check NEXT_PUBLIC_JLO_CATALOG_URL / JLO_API_BASE_URL on Netlify.',
        ],
      },
      { status: 500 }
    );
  }
}
