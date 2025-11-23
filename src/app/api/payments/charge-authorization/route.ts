import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { customerId, amount, authorization_code, email, metadata } = await request.json();

    if (!customerId || !amount || !authorization_code || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    const chargeResponse = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        authorization_code,
        metadata: {
          customer_id: customerId,
          ...metadata,
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
