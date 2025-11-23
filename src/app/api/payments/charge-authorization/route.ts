import { Buffer } from 'buffer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { customerId, amount, authorization_code, email, metadata } = await request.json();
    const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};
    const headerCustomerId = request.headers.get('x-customer-id');

    if (headerCustomerId && headerCustomerId !== String(customerId)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: customer mismatch' },
        { status: 403 }
      );
    }

    if (!customerId || !amount || !authorization_code || (!email && !headerCustomerId)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    const wpUrl = process.env.NEXT_PUBLIC_WP_URL;
    const wcKey = process.env.NEXT_PUBLIC_WC_KEY;
    const wcSecret = process.env.NEXT_PUBLIC_WC_SECRET;
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey || !wpUrl || !wcKey || !wcSecret) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    // Validate customer and ensure the authorization belongs to them
    const customerResponse = await fetch(`${wpUrl}/wp-json/wc/v3/customers/${customerId}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${wcKey}:${wcSecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!customerResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Unable to load customer record' },
        { status: 403 }
      );
    }

    const customerData = await customerResponse.json();
    const savedCardsMeta = customerData?.meta_data?.find((m: any) => m.key === 'saved_payment_cards');
    let savedCards: any[] = [];

    if (savedCardsMeta?.value) {
      try {
        savedCards = Array.isArray(savedCardsMeta.value)
          ? savedCardsMeta.value
          : JSON.parse(savedCardsMeta.value);
      } catch {
        savedCards = [];
      }
    }

    const matchedCard = Array.isArray(savedCards)
      ? savedCards.find((card: any) => card?.authorization_code === authorization_code)
      : null;

    if (!matchedCard) {
      return NextResponse.json(
        { success: false, error: 'Saved card not found for this customer' },
        { status: 403 }
      );
    }

    const chargeEmail = email || customerData?.email;
    if (!chargeEmail) {
      return NextResponse.json(
        { success: false, error: 'Customer email is required for payment' },
        { status: 400 }
      );
    }

    const chargeResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: chargeEmail,
        amount,
        authorization_code,
        metadata: {
          customer_id: customerId,
          ...safeMetadata,
        },
      }),
    });

    const chargeData = await chargeResponse.json();

    if (!chargeResponse.ok || !chargeData?.status) {
      return NextResponse.json(
        { success: false, error: chargeData?.message || 'Charge failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: chargeData.data });
  } catch (error) {
    console.error('Error charging authorization:', error);
    return NextResponse.json(
      { success: false, error: 'Unexpected error charging authorization' },
      { status: 500 }
    );
  }
}
