import { NextRequest, NextResponse } from 'next/server';

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
    const { reference, orderId, saveCard, customerId } = body;

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

    // Step 3: If customer wants to save card, save it
    let cardSaved = false;
    if (saveCard && customerId && paystackData.data.authorization?.reusable) {
      try {
        cardSaved = await saveCustomerCard(
          customerId,
          paystackData.data.authorization
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

async function saveCustomerCard(
  customerId: number, 
  authorization: any
): Promise<boolean> {
  try {
    // Get existing customer data
    const customer = await wooCommerceAPI(`customers/${customerId}`, 'GET');
    
    // Get existing saved cards
    const existingCardsMeta = customer.meta_data?.find(
      (m: any) => m.key === 'saved_payment_cards'
    );
    
    let savedCards: any[] = [];
    if (existingCardsMeta?.value) {
      savedCards = typeof existingCardsMeta.value === 'string'
        ? JSON.parse(existingCardsMeta.value)
        : existingCardsMeta.value;
    }

    // Check if card already exists
    const cardExists = savedCards.some(
      (card: any) => card.authorization_code === authorization.authorization_code
    );

    if (!cardExists) {
      // Add new card
      const newCard = {
        id: `card_${Date.now()}`,
        authorization_code: authorization.authorization_code,
        card_type: authorization.card_type,
        last4: authorization.last4,
        exp_month: authorization.exp_month,
        exp_year: authorization.exp_year,
        bank: authorization.bank,
        country_code: authorization.country_code,
        is_default: savedCards.length === 0, // First card is default
      };

      savedCards.push(newCard);

      // Update customer meta data
      await wooCommerceAPI(`customers/${customerId}`, 'PUT', {
        meta_data: [
          {
            key: 'saved_payment_cards',
            value: JSON.stringify(savedCards),
          },
        ],
      });

      console.log('💳 Card saved for customer:', customerId);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error saving customer card:', error);
    throw error;
  }
}