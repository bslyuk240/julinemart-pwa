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

const JLO_SHIPPING_URL =
  "https://julinemart.com/wp-json/jlo/v1/calc-shipping";

export async function getShippingFee(
  payload: JloShippingPayload
): Promise<JloShippingResponse> {
  const res = await axios.post(JLO_SHIPPING_URL, payload, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  return res.data as JloShippingResponse;
}
