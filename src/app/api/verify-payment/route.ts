import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // reference     — Paystack transaction reference (from inline callback or charge-authorization)
    // orderId       — JLO payment_reference used to look up the order in Supabase
    const { reference, orderId, saveCard, customerId, customerEmail } = body;

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

    // Save card to Supabase if customer opted in and card is reusable
    let cardSaved = false;
    if (saveCard && customerId && jloData.authorization?.reusable) {
      try {
        const email = customerEmail || jloData.authorization?.email || '';
        cardSaved = await saveCustomerCardToSupabase(customerId, jloData.authorization, email);
      } catch (err) {
        console.error('Failed to save card:', err);
      }
    }

    return NextResponse.json({
      success: true,
      order: jloData.order,
      payment: jloData.payment,
      cardSaved,
    });
  } catch (error: any) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}

async function saveCustomerCardToSupabase(
  customerId: string,
  authorization: any,
  email: string
): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();

    const { data: existing } = await supabase
      .from('customer_saved_cards')
      .select('id')
      .eq('customer_id', customerId)
      .eq('authorization_code', authorization.authorization_code)
      .maybeSingle();

    if (existing) return false;

    const { count } = await supabase
      .from('customer_saved_cards')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    const { error } = await supabase.from('customer_saved_cards').insert({
      customer_id: customerId,
      authorization_code: authorization.authorization_code,
      card_type: authorization.card_type || authorization.brand || 'card',
      last4: authorization.last4,
      exp_month: authorization.exp_month,
      exp_year: authorization.exp_year,
      bank: authorization.bank || null,
      country_code: authorization.country_code || null,
      email,
      is_default: (count ?? 0) === 0,
    });

    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error('Error saving card to Supabase:', err);
    throw err;
  }
}
