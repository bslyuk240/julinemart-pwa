import { NextRequest, NextResponse } from 'next/server';

/**
 * API Route: /api/vendors/[...path]
 * 
 * Proxies vendor API requests to WordPress to avoid CORS issues
 * 
 * Examples:
 * GET /api/vendors/status → /wp-json/julinemart/v1/vendors-status
 * GET /api/vendors/32 → /wp-json/julinemart/v1/vendors/32
 * GET /api/vendors/status/32 → /wp-json/julinemart/v1/vendor-status/32
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = params.path || [];
    
    // Build WordPress endpoint URL
    const baseUrl = process.env.WC_BASE_URL?.replace('/wc/v3', '') || '';
    
    let endpoint = '';
    
    // Map routes:
    // /api/vendors/status → /julinemart/v1/vendors-status
    // /api/vendors/32 → /julinemart/v1/vendors/32
    // /api/vendors/status/32 → /julinemart/v1/vendor-status/32
    // /api/vendors/product-count/32 → /julinemart/v1/vendor-product-count/32
    
    if (path[0] === 'status' && path[1]) {
      // /api/vendors/status/32 → /vendor-status/32
      endpoint = `julinemart/v1/vendor-status/${path[1]}`;
    } else if (path[0] === 'status') {
      // /api/vendors/status → /vendors-status
      endpoint = 'julinemart/v1/vendors-status';
    } else if (path[0] === 'product-count' && path[1]) {
      // /api/vendors/product-count/32 → /vendor-product-count/32
      endpoint = `julinemart/v1/vendor-product-count/${path[1]}`;
    } else if (path[0]) {
      // /api/vendors/32 → /vendors/32
      endpoint = `julinemart/v1/vendors/${path[0]}`;
    } else {
      // /api/vendors → /vendors
      endpoint = 'julinemart/v1/vendors';
    }
    
    const url = `${baseUrl}/${endpoint}`;
    
    console.log(`📡 Proxying vendor request: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error(`❌ Vendor API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `WordPress API error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('❌ Vendor proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}