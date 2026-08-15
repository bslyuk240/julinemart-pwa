export type GiftShippingQuoteParams = {
  deliveryState: string;
  deliveryCity: string;
  gfcCode?: string;
  giftBoxSlug?: string;
  builderSessionToken?: string;
  orderValue?: number;
};

export type GiftShippingQuoteResult = {
  shipping: number;
  zone?: string | null;
  order_value?: number;
};

export async function fetchGiftShippingQuote(
  params: GiftShippingQuoteParams
): Promise<GiftShippingQuoteResult> {
  const res = await fetch('/api/gifts/shipping-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      delivery_state: params.deliveryState,
      delivery_city: params.deliveryCity,
      gfc_code: params.gfcCode || 'warri',
      gift_box_slug: params.giftBoxSlug,
      builder_session_token: params.builderSessionToken,
      order_value: params.orderValue,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Could not calculate delivery fee');
  }

  return {
    shipping: Number(json.data?.shipping ?? 0),
    zone: json.data?.zone ?? null,
    order_value: json.data?.order_value,
  };
}
