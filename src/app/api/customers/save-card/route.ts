import { NextRequest, NextResponse } from "next/server";
import { updateCustomerMeta } from "@/lib/woocommerce/customers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Received save-card payload:", body);

    const { customerId, cards } = body;
    const headerCustomerId = request.headers.get("x-customer-id");

    if (headerCustomerId && headerCustomerId !== String(customerId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: customer mismatch" },
        { status: 403 }
      );
    }

    if (!customerId || !Array.isArray(cards)) {
      console.error("Missing fields:", { customerId, cards });
      return NextResponse.json(
        { success: false, error: "customerId and cards array are required" },
        { status: 400 }
      );
    }

    console.log("Updating WooCommerce meta");

    const result = await updateCustomerMeta(
      Number(customerId),
      "saved_payment_cards",
      cards
    );

    console.log("WooCommerce response:", result);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Failed to update customer meta" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, meta_data: result.meta_data });
  } catch (error: any) {
    console.error("API ROUTE ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unexpected server error",
        stack: error?.stack || null,
      },
      { status: 500 }
    );
  }
}
