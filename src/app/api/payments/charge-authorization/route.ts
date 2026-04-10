import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { success: false, error: 'Payment configuration error' },
        { status: 500 }
      );
    }

    // Validate customer and card using Supabase
    const supabase = getSupabaseServerClient();

    const { data: card, error: cardError } = await supabase
      .from('customer_saved_cards')
      .select('id, authorization_code, email')
      .eq('customer_id', customerId)
      .eq('authorization_code', authorization_code)
      .single();

    if (cardError || !card) {
      return NextResponse.json(
        { success: false, error: 'Saved card not found for this customer' },
        { status: 403 }
      );
    }

    const chargeEmail = email || card.email;
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
