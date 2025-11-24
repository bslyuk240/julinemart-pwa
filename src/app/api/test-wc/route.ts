import { NextResponse } from 'next/server';
import { wcApi } from '@/lib/woocommerce/client';

export async function GET() {
  console.log('🔍 Testing WooCommerce API Connection...');
  
  // Check if environment variables are loaded
  const config = {
    baseUrl: process.env.NEXT_PUBLIC_WC_BASE_URL,
    hasKey: !!process.env.NEXT_PUBLIC_WC_KEY,
    hasSecret: !!process.env.NEXT_PUBLIC_WC_SECRET,
    keyPrefix: process.env.NEXT_PUBLIC_WC_KEY?.substring(0, 5),
  };

  console.log('Config:', config);

  if (!config.baseUrl || !config.hasKey || !config.hasSecret) {
    return NextResponse.json({
      success: false,
      error: 'Environment variables not properly configured',
      config,
    }, { status: 500 });
  }

  try {
    console.log('Attempting to fetch products...');
    const response = await wcApi.get('products', { per_page: 1 });
    
    console.log('✅ API call successful!');
    
    return NextResponse.json({
      success: true,
      message: 'WooCommerce API is working!',
      productsCount: response.data.length,
      sampleProduct: response.data[0]?.name || 'No products found',
      config,
    });
  } catch (error: any) {
    console.error('❌ API call failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      },
      config,
    }, { status: 500 });
  }
}