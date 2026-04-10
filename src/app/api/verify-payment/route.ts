import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Simple WooCommerce client without type dependency
const WC_BASE_URL = process.env.NEXT_PUBLIC_WP_URL!;
const WC_KEY = process.env.WC_KEY!;
const WC_SECRET = process.env.WC_SECRET!;
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

// Helper function to make WooCommerce API calls
async function wooCommerceAPI(endpoint: string, method: string = 'GET', data?: any) {
  const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64');

  const url = `${WC_BASE_URL}/wp-json/wc/v3/${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`WooCommerce API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, orderId, saveCard, customerId, customerEmail } = body;

    if (!reference || !orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing reference or orderId' },
        { status: 400 }
      );
    }

    console.log('🔍 Verifying payment:', { reference, orderId });

    // Step 1: Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!paystackResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to verify payment with Paystack',
        },
        { status: 400 }
      );
    }

    const paystackData = await paystackResponse.json();

    console.log('💳 Paystack verification:', paystackData);

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment verification failed',
          paystackStatus: paystackData.data?.status || 'unknown'
        },
        { status: 400 }
      );
    }

    // Step 2: Payment verified! Update WooCommerce order
    const updateData = {
      status: 'processing',
      transaction_id: reference,
      date_paid: new Date().toISOString(),
      meta_data: [
        {
          key: '_paystack_reference',
          value: reference,
        },
        {
          key: '_paystack_amount',
          value: String(paystackData.data.amount || 0),
        },
        {
          key: '_paystack_paid_at',
          value: paystackData.data.paid_at || new Date().toISOString(),
        },
        {
          key: '_payment_verified',
          value: 'yes',
        },
      ],
    };

    console.log('📝 Updating WooCommerce order:', orderId);

    const wcResponse = await wooCommerceAPI(`orders/${orderId}`, 'PUT', updateData);

    console.log('✅ Order updated to processing:', wcResponse.id);

    // Step 3: If customer wants to save card, save it to Supabase
    let cardSaved = false;
    if (saveCard && customerId && paystackData.data.authorization?.reusable) {
      try {
        const email = customerEmail || paystackData.data.customer?.email || '';
        cardSaved = await saveCustomerCardToSupabase(
          customerId,
          paystackData.data.authorization,
          email
        );
      } catch (error) {
        console.error('❌ Failed to save card:', error);
        // Don't fail the whole request if card saving fails
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: wcResponse.id,
        number: wcResponse.number,
        status: wcResponse.status,
        total: wcResponse.total,
      },
      payment: {
        reference: reference,
        amount: (paystackData.data.amount || 0) / 100,
        status: paystackData.data.status,
      },
      cardSaved: cardSaved,
    });

  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Payment verification failed',
        details: error.toString()
      },
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

    // Check if card already exists
    const { data: existing } = await supabase
      .from('customer_saved_cards')
      .select('id')
      .eq('customer_id', customerId)
      .eq('authorization_code', authorization.authorization_code)
      .maybeSingle();

    if (existing) {
      console.log('💳 Card already saved for customer:', customerId);
      return false;
    }

    // Count existing cards to determine if this is the default
    const { count } = await supabase
      .from('customer_saved_cards')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    const isDefault = (count ?? 0) === 0;

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
      is_default: isDefault,
    });

    if (error) throw new Error(error.message);

    console.log('💳 Card saved to Supabase for customer:', customerId);
    return true;
  } catch (error) {
    console.error('Error saving customer card to Supabase:', error);
    throw error;
  }
}