import axios from "axios";

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ message: "Method Not Allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { api, method = "get", endpoint, payload } = body;

    if (!endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing endpoint" }),
      };
    }

    const WP_BASE =
      api === "wp"
        ? "https://admin.julinemart.com/wp-json"
        : "https://admin.julinemart.com/wp-json/wc/v3";

    const url = `${WP_BASE}/${endpoint}`;

    const response = await axios({
      method,
      url,
      data: payload,
      params:
        api === "wc"
          ? {
              consumer_key: process.env.WC_CONSUMER_KEY,
              consumer_secret: process.env.WC_CONSUMER_SECRET,
            }
          : undefined,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 20000,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        message: error.message,
        data: error.response?.data,
      }),
    };
  }
};
