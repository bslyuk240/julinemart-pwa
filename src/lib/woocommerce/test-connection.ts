/**
 * WooCommerce API Connection Test
 * Run this to verify your API connection works
 */

import { wcApi } from './client';

export async function testWooCommerceConnection() {
  console.log('🔌 Testing WooCommerce API Connection...');
  console.log('Base URL:', process.env.NEXT_PUBLIC_WC_BASE_URL);

  try {
    // Test 1: Fetch products
    console.log('\n📦 Test 1: Fetching products...');
    const productsResponse = await wcApi.get('products', { per_page: 5 });
    console.log('✅ Products fetched successfully!');
    console.log(`Found ${productsResponse.data.length} products`);
    
    if (productsResponse.data.length > 0) {
      console.log('Sample product:', productsResponse.data[0].name);
    }

    // Test 2: Fetch categories
    console.log('\n📁 Test 2: Fetching categories...');
    const categoriesResponse = await wcApi.get('products/categories', { per_page: 5 });
    console.log('✅ Categories fetched successfully!');
    console.log(`Found ${categoriesResponse.data.length} categories`);

    // Test 3: Check API status
    console.log('\n✨ Test 3: Checking system status...');
    const statusResponse = await wcApi.get('system_status');
    console.log('✅ System status retrieved!');
    console.log('WooCommerce Version:', statusResponse.data.wc_version);

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('Your WooCommerce API is connected and working!');
    
    return {
      success: true,
      productsCount: productsResponse.data.length,
      categoriesCount: categoriesResponse.data.length,
      wcVersion: statusResponse.data.wc_version,
    };

  } catch (error: any) {
    console.error('\n❌ CONNECTION FAILED!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      // Common errors
      if (error.response.status === 401) {
        console.error('\n⚠️  AUTHENTICATION ERROR:');
        console.error('- Check your Consumer Key and Secret');
        console.error('- Make sure they are correct in .env.local');
      } else if (error.response.status === 404) {
        console.error('\n⚠️  URL ERROR:');
        console.error('- Check your WooCommerce base URL');
        console.error('- Should end with /wp-json/wc/v3');
      }
    } else if (error.request) {
      console.error('\n⚠️  NETWORK ERROR:');
      console.error('- Check your internet connection');
      console.error('- Make sure WordPress site is accessible');
    }

    return {
      success: false,
      error: error.message,
    };
  }
}

// Quick test function you can call
export async function quickTest() {
  const result = await testWooCommerceConnection();
  return result;
}