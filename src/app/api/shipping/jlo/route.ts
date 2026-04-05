import { NextResponse } from 'next/server';

// Shipping is now calculated by the Supabase-backed JLO Netlify function.
// NEXT_PUBLIC_JLO_CATALOG_URL = https://jlo.julinemart.com
const JLO_BASE = (
  process.env.JLO_API_BASE_URL ||
  process.env.NEXT_PUBLIC_JLO_CATALOG_URL ||
  ''
).replace(/\/$/, '');

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (!JLO_BASE) {
      return NextResponse.json(
        { success: false, message: 'Shipping service not configured' },
        { status: 503 }
      );
    }

    const res = await fetch(`${JLO_BASE}/.netlify/functions/calc-shipping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return NextResponse.json(
        { success: false, message: data.error || data.message || 'Failed to calculate shipping' },
        { status: res.ok ? 400 : 500 }
      );
    }

    // Normalise response — checkout expects { success, shipping, ... }
    // calc-shipping returns { success, data: { totalShippingFee, subOrders, ... } }
    return NextResponse.json({
      success: true,
      shipping: data.data.totalShippingFee,
      breakdown: data.data.subOrders,
      zone: data.data.zoneName,
      totalWeight: data.data.totalWeight,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to calculate shipping' },
      { status: 500 }
    );
  }
}
