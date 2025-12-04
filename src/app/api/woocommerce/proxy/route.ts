import { NextResponse } from 'next/server';
import { wcApi, handleApiError } from '@/lib/woocommerce/client';

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

    return NextResponse.json(response.data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
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
      },
      { status }
    );
  }
}
