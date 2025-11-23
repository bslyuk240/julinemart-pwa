import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { reference } = await request.json();

    if (!reference) {
      return NextResponse.json(
        { error: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!paystackSecretKey) {
      console.error('Missing Paystack secret key');
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    // Verify transaction with Paystack
    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!verifyResponse.ok) {
      throw new Error('Failed to verify transaction with Paystack');
    }

    const verifyData = await verifyResponse.json();

    if (verifyData.status && verifyData.data.status === 'success') {
      const authorization = verifyData.data.authorization;

      // Return the card authorization details
      return NextResponse.json({
        success: true,
        authorization: {
          authorization_code: authorization.authorization_code,
          card_type: authorization.card_type,
          last4: authorization.last4,
          exp_month: authorization.exp_month,
          exp_year: authorization.exp_year,
          bank: authorization.bank,
          country_code: authorization.country_code,
          brand: authorization.brand,
          reusable: authorization.reusable,
          signature: authorization.signature,
        },
        transaction: {
          reference: verifyData.data.reference,
          amount: verifyData.data.amount,
          currency: verifyData.data.currency,
        },
      });
    } else {
      return NextResponse.json(
        { error: 'Transaction verification failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    return NextResponse.json(
      { error: 'Failed to verify transaction' },
      { status: 500 }
    );
  }
}