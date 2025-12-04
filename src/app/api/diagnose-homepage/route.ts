import { NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce/client';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {
      WP_URL: process.env.NEXT_PUBLIC_WP_URL || 'NOT SET',
      WC_BASE_URL: process.env.WC_BASE_URL || 'NOT SET',
      WC_KEY: process.env.WC_KEY ? 'SET' : 'NOT SET',
      WC_SECRET: process.env.WC_SECRET ? 'SET' : 'NOT SET',
    },
    tests: [],
  };

  try {
    // Test 1: Fetch all tags
    console.log('\n📌 Test 1: Fetching all product tags...');
    results.tests.push({ name: 'Fetch All Tags', status: 'running' });
    
    const tagsResponse = await wcApi.get('products/tags', { per_page: 100 });
    const allTags = tagsResponse.data;
    
    results.tests[0].status = 'success';
    results.tests[0].count = allTags.length;
    results.tests[0].tags = allTags.map((t: any) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      count: t.count,
    }));

    // Test 2: Check for specific tags
    const targetTags = ['flash-sale', 'deal', 'best-seller'];
    results.tests.push({ 
      name: 'Check Target Tags',
      status: 'running',
      targetTags,
      found: [],
      missing: [],
    });

    targetTags.forEach(tagSlug => {
      const found = allTags.find((t: any) => t.slug === tagSlug);
      if (found) {
        results.tests[1].found.push({
          slug: tagSlug,
          id: found.id,
          name: found.name,
          count: found.count,
        });
      } else {
        results.tests[1].missing.push(tagSlug);
      }
    });
    results.tests[1].status = 'success';

    // Test 3: Fetch products by each tag
    results.tests.push({ 
      name: 'Fetch Products by Tag',
      status: 'running',
      results: [],
    });

    for (const tagSlug of targetTags) {
      try {
        console.log(`\n📦 Fetching products with tag: ${tagSlug}`);
        
        const productsResponse = await wcApi.get('products', {
          tag: tagSlug,
          per_page: 10,
        });
        
        const products = productsResponse.data;
        
        results.tests[2].results.push({
          tag: tagSlug,
          success: true,
          count: products.length,
          products: products.map((p: any) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            status: p.status,
            tags: p.tags.map((t: any) => ({ name: t.name, slug: t.slug })),
          })),
        });

        console.log(`✅ Found ${products.length} products with tag: ${tagSlug}`);
      } catch (error: any) {
        results.tests[2].results.push({
          tag: tagSlug,
          success: false,
          error: error.message,
          count: 0,
        });
        console.error(`❌ Error fetching products with tag ${tagSlug}:`, error.message);
      }
    }
    results.tests[2].status = 'success';

    // Test 4: Test with tag ID instead of slug
    results.tests.push({ 
      name: 'Fetch Products by Tag ID',
      status: 'running',
      results: [],
    });

    for (const tagInfo of results.tests[1].found) {
      try {
        console.log(`\n🆔 Fetching products with tag ID: ${tagInfo.id}`);
        
        const productsResponse = await wcApi.get('products', {
          tag: tagInfo.id.toString(),
          per_page: 10,
        });
        
        const products = productsResponse.data;
        
        results.tests[3].results.push({
          tag: tagInfo.slug,
          tagId: tagInfo.id,
          success: true,
          count: products.length,
          products: products.map((p: any) => ({
            id: p.id,
            name: p.name,
          })),
        });

        console.log(`✅ Found ${products.length} products with tag ID: ${tagInfo.id}`);
      } catch (error: any) {
        results.tests[3].results.push({
          tag: tagInfo.slug,
          tagId: tagInfo.id,
          success: false,
          error: error.message,
        });
      }
    }
    results.tests[3].status = 'success';

    // Generate summary and recommendations
    results.summary = {
      totalTags: allTags.length,
      targetTagsFound: results.tests[1].found.length,
      targetTagsMissing: results.tests[1].missing.length,
      productsFound: results.tests[2].results.reduce((sum: number, r: any) => sum + (r.count || 0), 0),
    };

    results.recommendations = [];
    
    // Check for missing tags
    if (results.tests[1].missing.length > 0) {
      results.recommendations.push({
        type: 'error',
        message: `Missing tags: ${results.tests[1].missing.join(', ')}`,
        action: 'Go to WordPress Admin → Products → Tags and create these tags',
      });
    }

    // Check for tags with no products
    results.tests[2].results.forEach((result: any) => {
      if (result.success && result.count === 0) {
        const tagInfo = results.tests[1].found.find((t: any) => t.slug === result.tag);
        if (tagInfo && tagInfo.count === 0) {
          results.recommendations.push({
            type: 'warning',
            message: `Tag "${result.tag}" exists but has no products`,
            action: 'Edit your products in WordPress and add this tag to them',
          });
        } else if (tagInfo && tagInfo.count > 0) {
          results.recommendations.push({
            type: 'error',
            message: `Tag "${result.tag}" shows ${tagInfo.count} products in WordPress but API returns 0`,
            action: 'This might be a WooCommerce indexing issue. Try going to WooCommerce → Status → Tools → "Recount terms"',
          });
        }
      }
    });

    // Check if products are fetched successfully
    const successfulFetches = results.tests[2].results.filter((r: any) => r.success && r.count > 0);
    if (successfulFetches.length > 0) {
      results.recommendations.push({
        type: 'success',
        message: `Successfully fetched products for: ${successfulFetches.map((r: any) => r.tag).join(', ')}`,
        action: 'Your homepage should be showing these products. If not, check cache settings.',
      });
    }

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });

  } catch (error: any) {
    console.error('❌ Diagnostic failed:', error);
    
    return NextResponse.json({
      error: true,
      message: error.message,
      details: error.response?.data || 'No additional details',
      environment: results.environment,
      recommendations: [
        {
          type: 'error',
          message: 'Failed to connect to WooCommerce API',
          action: 'Check your .env.local file and verify API credentials',
        },
      ],
    }, { status: 500 });
  }
}
