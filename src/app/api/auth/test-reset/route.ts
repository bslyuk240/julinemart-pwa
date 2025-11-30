import { NextRequest, NextResponse } from 'next/server';

// Test endpoint to verify WordPress password reset API connectivity
// Visit: https://julinemart-pwa.netlify.app/api/auth/test-reset

export async function GET(request: NextRequest) {
  const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
  
  const results: any = {
    timestamp: new Date().toISOString(),
    wp_url: WP_URL || 'NOT SET',
    tests: [],
  };

  if (!WP_URL) {
    return NextResponse.json({
      ...results,
      error: 'NEXT_PUBLIC_WP_URL is not configured',
    }, { status: 500 });
  }

  // Test 1: Check if WordPress REST API is accessible
  try {
    const wpResponse = await fetch(`${WP_URL}/wp-json/`);
    results.tests.push({
      name: 'WordPress REST API',
      url: `${WP_URL}/wp-json/`,
      status: wpResponse.ok ? 'OK' : 'FAILED',
      httpStatus: wpResponse.status,
    });
  } catch (error: any) {
    results.tests.push({
      name: 'WordPress REST API',
      url: `${WP_URL}/wp-json/`,
      status: 'ERROR',
      error: error.message,
    });
  }

  // Test 2: Check if JulineMart password reset endpoint exists
  try {
    // We'll do an OPTIONS request or just check the namespace
    const namespaceResponse = await fetch(`${WP_URL}/wp-json/julinemart/v1/`);
    results.tests.push({
      name: 'JulineMart API Namespace',
      url: `${WP_URL}/wp-json/julinemart/v1/`,
      status: namespaceResponse.ok ? 'OK' : 'NOT FOUND',
      httpStatus: namespaceResponse.status,
    });
  } catch (error: any) {
    results.tests.push({
      name: 'JulineMart API Namespace',
      url: `${WP_URL}/wp-json/julinemart/v1/`,
      status: 'ERROR',
      error: error.message,
    });
  }

  // Test 3: Try calling the forgot password endpoint with a test
  try {
    const forgotResponse = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@test.com' }), // Fake email for testing
    });
    
    const forgotData = await forgotResponse.json().catch(() => ({}));
    
    results.tests.push({
      name: 'Forgot Password Endpoint',
      url: `${WP_URL}/wp-json/julinemart/v1/password/forgot`,
      status: forgotResponse.ok ? 'OK' : 'RESPONDED',
      httpStatus: forgotResponse.status,
      response: forgotData,
    });
  } catch (error: any) {
    results.tests.push({
      name: 'Forgot Password Endpoint',
      url: `${WP_URL}/wp-json/julinemart/v1/password/forgot`,
      status: 'ERROR',
      error: error.message,
    });
  }

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  // Allow testing with a real email
  const { email } = await request.json();
  const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

  if (!WP_URL) {
    return NextResponse.json({ error: 'WP_URL not configured' }, { status: 500 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    console.log(`Testing password reset for: ${email}`);
    console.log(`Calling: ${WP_URL}/wp-json/julinemart/v1/password/forgot`);

    const response = await fetch(`${WP_URL}/wp-json/julinemart/v1/password/forgot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json().catch(() => ({}));

    console.log('Response status:', response.status);
    console.log('Response data:', data);

    return NextResponse.json({
      endpoint: `${WP_URL}/wp-json/julinemart/v1/password/forgot`,
      httpStatus: response.status,
      success: response.ok,
      response: data,
    });
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}