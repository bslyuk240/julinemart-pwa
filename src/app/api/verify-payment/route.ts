import { NextRequest, NextResponse } from 'next/server';

const JLO_BASE = (process.env.JLO_API_BASE_URL || '').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // reference     — Paystack transaction reference (from inline callback or charge-authorization)
    // orderId       — JLO payment_reference used to look up the order in Supabase
    const { reference, orderId, saveCard, customerId } = body;

    if (!reference || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing reference or orderId' },
        { status: 400 }
      );
    }

    const jloRes = await fetch(`${JLO_BASE}/api/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_reference: orderId,    // JLO order lookup key
        paystack_reference: reference, // Paystack transaction to verify
      }),
    });

    const jloData = await jloRes.json();

    if (!jloRes.ok || !jloData.success) {
      return NextResponse.json(
        {
          success: false,
          error: jloData.error || 'Payment verification failed',
          paystack_status: jloData.paystack_status,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: jloData.order,
      payment: jloData.payment,
      cardSaved: false,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}
