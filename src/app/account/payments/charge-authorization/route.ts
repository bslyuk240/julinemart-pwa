import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, email, amount, authorization_code, metadata } = body;

    // Validate required fields
    if (!customerId || !email || !amount || !authorization_code) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: customerId, email, amount, authorization_code' 
        },
        { status: 400 }
      );
    }

    // Validate amount is positive
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error('Missing Paystack secret key');
      return NextResponse.json(
        { success: false, error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    console.log('🔵 Charging authorization for customer:', customerId);
    console.log('🔵 Amount:', amount, 'kobo');

    // Call Paystack charge authorization endpoint
    const chargeResponse = await fetch(
      'https://api.paystack.co/transaction/charge_authorization',
      {
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
            ...(metadata || {}),
          },
        }),
      }
    );

    if (!chargeResponse.ok) {
      const errorData = await chargeResponse.json().catch(() => null);
      console.error('❌ Paystack charge failed:', errorData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorData?.message || 'Payment failed. Please try another payment method.' 
        },
        { status: 400 }
      );
    }

    const chargeData = await chargeResponse.json();

    if (chargeData.status && chargeData.data.status === 'success') {
      console.log('✅ Charge successful:', chargeData.data.reference);

      return NextResponse.json({
        success: true,
        reference: chargeData.data.reference,
        amount: chargeData.data.amount,
        currency: chargeData.data.currency,
        transaction: chargeData.data,
      });
    } else {
      console.error('❌ Charge not successful:', chargeData);
      
      return NextResponse.json(
        { 
          success: false, 
          error: chargeData.data?.gateway_response || 'Payment failed' 
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Charge authorization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Failed to process payment' 
      },
      { status: 500 }
    );
  }
}