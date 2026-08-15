export type GiftVoucherApplyParams = {
  voucherCode: string;
  customerEmail: string;
  giftBoxSlug?: string;
  builderSessionToken?: string;
  gfcCode?: string;
  orderSubtotal: number;
  occasion?: string;
};

export type GiftVoucherResult = {
  code: string;
  campaign_name?: string;
  discount_amount: number;
  order_subtotal: number;
  discounted_subtotal: number;
};

export async function validateGiftVoucher(
  params: GiftVoucherApplyParams
): Promise<GiftVoucherResult> {
  const res = await fetch('/api/gifts/voucher/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voucher_code: params.voucherCode.trim().toUpperCase(),
      customer_email: params.customerEmail.trim(),
      gift_box_slug: params.giftBoxSlug,
      builder_session_token: params.builderSessionToken,
      gfc_code: params.gfcCode || 'warri',
      order_subtotal: params.orderSubtotal,
      occasion: params.occasion?.trim() || undefined,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Invalid voucher code');
  }

  return json.data as GiftVoucherResult;
}
