import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { customerId, cards } = await req.json();

    if (!customerId || !Array.isArray(cards)) {
      return NextResponse.json(
        { success: false, error: "customerId and cards array are required" },
        { status: 400 }
      );
    }

    const consumerKey = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
    const consumerSecret = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;
    const storeUrl = process.env.NEXT_PUBLIC_WP_URL;

    // Fetch existing meta_data
    const customerRes = await fetch(
      `${storeUrl}/wp-json/wc/v3/customers/${customerId}?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`
    );

    if (!customerRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch customer data" },
        { status: customerRes.status }
      );
    }

    const customer = await customerRes.json();

    let meta = customer.meta_data || [];
    const existing = meta.find((m: any) => m.key === "_saved_payment_cards");

    if (existing) {
      existing.value = cards;
    } else {
      meta.push({ key: "_saved_payment_cards", value: cards });
    }

    // Update WooCommerce
    const updateRes = await fetch(
      `${storeUrl}/wp-json/wc/v3/customers/${customerId}?consumer_key=${consumerKey}&consumer_secret=${consumerSecret}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meta_data: meta }),
      }
    );

    if (!updateRes.ok) {
      return NextResponse.json(
        { success: false, error: "Failed to update customer meta" },
        { status: updateRes.status }
      );
    }

    const updated = await updateRes.json();

    return NextResponse.json({ success: true, customer: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
