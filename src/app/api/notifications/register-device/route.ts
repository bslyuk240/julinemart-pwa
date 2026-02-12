// src/app/api/notifications/register-device/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCustomer, updateCustomerMeta } from '@/lib/woocommerce/customers';

const TOKEN_META_KEY = 'fcm_device_tokens';
const MAX_TOKENS_PER_CUSTOMER = 10;

type RegisterDevicePayload = {
  customerId?: string | number;
  fcmToken?: string;
  platform?: string;
};

function normalizeCustomerId(value: unknown): number | null {
  const customerId = Number(value);
  if (!Number.isInteger(customerId) || customerId <= 0) {
    return null;
  }
  return customerId;
}

function normalizeToken(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const token = value.trim();
  return token.length > 0 ? token : null;
}

function parseStoredTokens(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return parseStoredTokens(parsed);
    } catch {
      return [trimmed];
    }
  }

  return [];
}

function upsertToken(tokens: string[], newToken: string): string[] {
  const withoutToken = tokens.filter((token) => token !== newToken);
  const updated = [...withoutToken, newToken];
  return updated.slice(-MAX_TOKENS_PER_CUSTOMER);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterDevicePayload;
    const customerId = normalizeCustomerId(body.customerId);
    const fcmToken = normalizeToken(body.fcmToken);
    const platform = typeof body.platform === 'string' ? body.platform : 'unknown';

    if (!customerId || !fcmToken) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId or fcmToken' },
        { status: 400 }
      );
    }

    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const existingMeta = customer.meta_data?.find((meta) => meta.key === TOKEN_META_KEY);
    const existingTokens = parseStoredTokens(existingMeta?.value);
    const nextTokens = upsertToken(existingTokens, fcmToken);

    const updated = await updateCustomerMeta(customerId, TOKEN_META_KEY, nextTokens);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Failed to persist device token' },
        { status: 500 }
      );
    }

    console.log(
      `Registered push token for customer ${customerId} on ${platform}. Count=${nextTokens.length}`
    );

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      tokenCount: nextTokens.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to register device';
    console.error('Register device error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const customerId = normalizeCustomerId(
      request.nextUrl.searchParams.get('customerId')
    );

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId' },
        { status: 400 }
      );
    }

    const customer = await getCustomer(customerId);
    if (!customer) {
      return NextResponse.json({
        success: true,
        tokens: [],
        count: 0,
      });
    }

    const tokenMeta = customer.meta_data?.find((meta) => meta.key === TOKEN_META_KEY);
    const tokens = parseStoredTokens(tokenMeta?.value);

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to get device tokens';
    console.error('Get device tokens error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
