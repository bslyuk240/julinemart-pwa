import axios from "axios";

export type JloShippingItem = {
  hubId: string;
  quantity: number;
  weight: number;
};

export type JloShippingPayload = {
  deliveryState: string;
  deliveryCity: string;
  items: JloShippingItem[];
  totalOrderValue: number;
};

export type JloShippingResponse = {
  success: boolean;
  shipping: number;
  message?: string;
};

export async function getShippingFee(
  payload: JloShippingPayload
): Promise<JloShippingResponse> {
  const res = await fetch('/api/shipping/jlo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error('Failed to calculate shipping');
  }

  return (await res.json()) as JloShippingResponse;
}
