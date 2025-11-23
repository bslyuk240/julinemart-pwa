/**
 * Debug Script to Test WooCommerce Product Tags
 * 
 * This will help you verify:
 * 1. If tags exist in WooCommerce
 * 2. If products are correctly tagged
 * 3. If the API is returning tagged products
 * 
 * HOW TO USE:
 * 1. Create this file: src/app/api/debug/tags/route.ts
 * 2. Visit: http://localhost:3000/api/debug/tags
 * 3. Check the JSON response
 */

import { NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce/client';

export async function GET() {
  try {
    console.log('🔍 Starting tag debug...');

    // Step 1: Get all product tags
    console.log('\n📌 Fetching all product tags...');
    const tagsResponse = await wcApi.get('products/tags', { per_page: 100 });
    const allTags = tagsResponse.data;
    
    console.log(`Found ${allTags.length} total tags`);

    // Step 2: Find our specific tags
    const targetTags = ['flash-sale', 'deal', 'best-seller'];
    const foundTags = allTags.filter((tag: any) => 
      targetTags.includes(tag.slug)
    );

    console.log('\n🎯 Target tags status:');
    targetTags.forEach(tagSlug => {
      const found = foundTags.find((t: any) => t.slug === tagSlug);
      if (found) {
        console.log(`✅ ${tagSlug}: EXISTS (ID: ${found.id}, Count: ${found.count})`);
      } else {
        console.log(`❌ ${tagSlug}: NOT FOUND`);
      }
    });

    // Step 3: Try fetching products with each tag
    console.log('\n📦 Fetching products by tag...');
    const results = await Promise.all(
      targetTags.map(async (tagSlug) => {
        try {
          const productsResponse = await wcApi.get('products', { 
            tag: tagSlug,
            per_page: 10 
          });
          const products = productsResponse.data;
          
          return {
            tag: tagSlug,
            success: true,
            count: products.length,
            products: products.map((p: any) => ({
              id: p.id,
              name: p.name,
              tags: p.tags.map((t: any) => t.slug),
            })),
          };
        } catch (error: any) {
          return {
            tag: tagSlug,
            success: false,
            error: error.message,
            count: 0,
            products: [],
          };
        }
      })
    );

    // Step 4: Return comprehensive debug info
    const debugInfo = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTags: allTags.length,
        foundTargetTags: foundTags.length,
        expectedTags: targetTags.length,
      },
      tags: {
        all: allTags.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          count: t.count,
        })),
        target: foundTags.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          count: t.count,
        })),
      },
      productsByTag: results,
      recommendations: [],
    };

    // Generate recommendations
    results.forEach(result => {
      if (!result.success) {
        debugInfo.recommendations.push(
          `❌ Tag "${result.tag}" failed to fetch products: ${result.error}`
        );
      } else if (result.count === 0) {
        const tagExists = foundTags.find((t: any) => t.slug === result.tag);
        if (!tagExists) {
          debugInfo.recommendations.push(
            `⚠️ Tag "${result.tag}" does not exist in WooCommerce. Create it in WordPress Admin → Products → Tags`
          );
        } else {
          debugInfo.recommendations.push(
            `⚠️ Tag "${result.tag}" exists but has no products. Add this tag to products in WordPress Admin`
          );
        }
      } else {
        debugInfo.recommendations.push(
          `✅ Tag "${result.tag}" working correctly with ${result.count} product(s)`
        );
      }
    });

    console.log('\n✅ Debug complete!');
    console.log('Recommendations:', debugInfo.recommendations);

    return NextResponse.json(debugInfo, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error: any) {
    console.error('❌ Debug failed:', error);
    
    return NextResponse.json({
      error: true,
      message: error.message,
      details: error.response?.data || 'No additional details',
      recommendations: [
        '1. Check your WooCommerce API credentials in .env.local',
        '2. Verify your WordPress site is accessible',
        '3. Ensure WooCommerce REST API is enabled',
      ],
    }, { status: 500 });
  }
}