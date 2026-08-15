/** Gift G5 — delivery date window from JLO */

export type GiftDeliveryDatesParams = {
  gfcCode?: string;
  giftBoxSlug?: string;
  builderSessionToken?: string;
};

export type GiftDeliveryDatesResult = {
  earliest_date: string;
  latest_date: string;
  max_lead_time_days: number;
  same_day_supported: boolean;
  next_day_supported: boolean;
  cutoff_time: string | null;
};

export async function fetchGiftDeliveryDates(
  params: GiftDeliveryDatesParams
): Promise<GiftDeliveryDatesResult> {
  const res = await fetch('/api/gifts/delivery-dates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gfc_code: params.gfcCode || 'warri',
      gift_box_slug: params.giftBoxSlug,
      builder_session_token: params.builderSessionToken,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Could not load delivery dates');
  }

  return json.data as GiftDeliveryDatesResult;
}
