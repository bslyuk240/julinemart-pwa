// src/app/api/notifications/register-device/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Store for FCM tokens (in production, use a database)
// Format: { customerId: string, tokens: string[], updatedAt: Date }
const deviceTokens = new Map<string, { tokens: Set<string>; updatedAt: Date }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, fcmToken, platform } = body;

    if (!customerId || !fcmToken) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId or fcmToken' },
        { status: 400 }
      );
    }

    console.log(`📱 Registering device token for customer ${customerId}`);
    console.log(`   Token: ${fcmToken.substring(0, 20)}...`);
    console.log(`   Platform: ${platform}`);

    // Get or create token set for customer
    let customerTokens = deviceTokens.get(customerId);
    if (!customerTokens) {
      customerTokens = { tokens: new Set(), updatedAt: new Date() };
      deviceTokens.set(customerId, customerTokens);
    }

    // Add token to set (Set automatically handles duplicates)
    customerTokens.tokens.add(fcmToken);
    customerTokens.updatedAt = new Date();

    console.log(`✅ Token registered. Customer ${customerId} now has ${customerTokens.tokens.size} device(s)`);

    // TODO: In production, save to your database
    // Example:
    // await db.deviceTokens.upsert({
    //   where: { customerId },
    //   update: { tokens: Array.from(customerTokens.tokens), updatedAt: new Date() },
    //   create: { customerId, tokens: [fcmToken], createdAt: new Date() }
    // });

    return NextResponse.json({
      success: true,
      message: 'Device registered successfully',
      tokenCount: customerTokens.tokens.size,
    });
  } catch (error: any) {
    console.error('❌ Register device error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to register device' },
      { status: 500 }
    );
  }
}

// Helper function to get tokens for a customer
export async function GET(request: NextRequest) {
  try {
    const customerId = request.nextUrl.searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Missing customerId' },
        { status: 400 }
      );
    }

    const customerTokens = deviceTokens.get(customerId);

    if (!customerTokens) {
      return NextResponse.json({
        success: true,
        tokens: [],
        count: 0,
      });
    }

    return NextResponse.json({
      success: true,
      tokens: Array.from(customerTokens.tokens),
      count: customerTokens.tokens.size,
      updatedAt: customerTokens.updatedAt,
    });
  } catch (error: any) {
    console.error('❌ Get device tokens error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to get device tokens' },
      { status: 500 }
    );
  }
}
