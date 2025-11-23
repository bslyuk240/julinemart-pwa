import { NextRequest, NextResponse } from "next/server";

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
const CK = process.env.NEXT_PUBLIC_WC_CONSUMER_KEY;
const CS = process.env.NEXT_PUBLIC_WC_CONSUMER_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { customerId, cards } = await request.json();

    if (!customerId || !Array.isArray(cards)) {
      return NextResponse.json(
        {
          success: false,
          error: "customerId and cards array are required",
        },
        { status: 400 }
      );
    }

    // WooCommerce requires a full meta_data object
    const payload = {
      meta_data: [
        {
          key: "_saved_payment_cards",
          value: JSON.stringify(cards), // Store as string for compatibility
        },
      ],
    };

    const url = `${WP_URL}/wp-json/wc/v3/customers/${customerId}?consumer_key=${CK}&consumer_secret=${CS}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("WooCommerce meta update failed:", errorBody);

      return NextResponse.json(
        { success: false, error: "Failed to update WooCommerce meta data" },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: "Card saved successfully",
      meta: data.meta_data,
    });
  } catch (error) {
    console.error("Save card error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
