// netlify/functions/woocommerce-proxy.ts
import type { Handler } from '@netlify/functions';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

const api = new WooCommerceRestApi({
  url: process.env.WC_BASE_URL?.replace('/wp-json/wc/v3', '') || '',
  consumerKey: process.env.WC_CONSUMER_KEY || process.env.WC_KEY || '',
  consumerSecret: process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET || '',
  version: 'wc/v3',
  queryStringAuth: true,
  timeout: 60000,
});

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { method, endpoint, payload } = body;

    if (!method || !endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing method or endpoint' }),
      };
    }

    let response;

    if (method === 'get') {
      response = await api.get(endpoint, payload?.params);
    } else if (method === 'post') {
      response = await api.post(endpoint, payload?.data);
    } else if (method === 'put') {
      response = await api.put(endpoint, payload?.data);
    } else if (method === 'delete') {
      response = await api.delete(endpoint, payload?.params);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Unsupported method' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response.data),
    };
  } catch (error: any) {
    console.error('WooCommerce proxy error:', error);
    
    return {
      statusCode: error?.response?.status || 500,
      body: JSON.stringify({
        message: error?.response?.data?.message || error?.message || 'Proxy failed',
        details: error?.response?.data || null,
      }),
    };
  }
};