import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

export const maxDuration = 60; // Vercel: allow up to 60 seconds
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { method, endpoint, payload } = body as {
      method: 'get' | 'post' | 'put' | 'delete';
      endpoint: string;
      payload?: any;
    };

    if (!method || !endpoint) {
      return NextResponse.json({ message: 'Missing method or endpoint' }, { status: 400 });
    }

    let response;
    let retries = 2;
    let lastError;

    // Retry logic for connection issues
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (method === 'get') {
          response = await wcApi.get(endpoint, payload?.params);
        } else if (method === 'post') {
          response = await wcApi.post(endpoint, payload?.data);
        } else if (method === 'put') {
          response = await wcApi.put(endpoint, payload?.data);
        } else if (method === 'delete') {
          response = await wcApi.delete(endpoint, payload?.params);
        } else {
          return NextResponse.json({ message: 'Unsupported method' }, { status: 400 });
        }

        // If successful, break the retry loop
        break;
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a retryable error (connection reset, timeout, etc.)
        const isRetryable = 
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNREFUSED' ||
          error?.message?.includes('ECONNRESET') ||
          error?.message?.includes('socket hang up');

        if (isRetryable && attempt < retries) {
          console.log(`Connection error on attempt ${attempt + 1}, retrying...`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }

        // If not retryable or out of retries, throw the error
        throw error;
      }
    }

    if (!response) {
      throw lastError || new Error('No response received');
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: { 
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*', // Allow CORS
      },
    });
  } catch (error: any) {
    handleApiError(error);
    
    const status = error?.response?.status || 500;
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'WooCommerce proxy failed';
      
    return NextResponse.json(
      {
        message,
        details: error?.response?.data || null,
        code: error?.code || null,
      },
      { status }
    );
  }
}