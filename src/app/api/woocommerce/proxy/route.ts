import { NextResponse } from "next/server";

/** WooCommerce proxy retired — catalog and orders use Supabase/JLO. */
export async function POST() {
  return NextResponse.json(
    {
      error: "WooCommerce API proxy is retired. Use /api/catalog/* and JLO Netlify functions.",
    },
    { status: 410 }
  );
}
