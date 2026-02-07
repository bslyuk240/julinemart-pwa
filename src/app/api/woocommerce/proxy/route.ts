import { NextResponse } from "next/server";
import axios from "axios";
import { wcApi, handleApiError } from "@/lib/woocommerce/client";

type ProxyBody = {
  method: "get" | "post" | "put" | "delete";
  endpoint: string; // e.g. "products" OR "wp:wcfmmp/v1/vendors/35"
  payload?: {
    params?: any;
    data?: any;
  };
};

const getWpBaseUrl = () => {
  // Prefer explicit WP URL if you have it
  const wpPublic = process.env.NEXT_PUBLIC_WP_URL;

  // Fallback: derive from WC_BASE_URL (commonly ends with /wp-json/wc/v3)
  const wcBase = process.env.WC_BASE_URL;

  const derived =
    wcBase?.replace(/\/wp-json\/wc\/v3\/?$/, "") ||
    wcBase?.replace(/\/wp-json\/wc\/v3.*$/, "") ||
    "";

  const base = (wpPublic || derived || "").replace(/\/$/, "");
  return base;
};

const getWcCredentials = () => {
  const consumer_key = process.env.WC_CONSUMER_KEY || process.env.WC_KEY || "";
  const consumer_secret =
    process.env.WC_CONSUMER_SECRET || process.env.WC_SECRET || "";
  return { consumer_key, consumer_secret };
};

async function callWpJson(
  method: "get" | "post" | "put" | "delete",
  wpEndpoint: string,
  payload?: { params?: any; data?: any }
) {
  const wpBase = getWpBaseUrl();
  if (!wpBase) {
    throw new Error(
      "Missing WP base URL. Set NEXT_PUBLIC_WP_URL (recommended) or WC_BASE_URL."
    );
  }

  const { consumer_key, consumer_secret } = getWcCredentials();
  if (!consumer_key || !consumer_secret) {
    throw new Error(
      "Missing WooCommerce credentials. Set WC_CONSUMER_KEY/WC_CONSUMER_SECRET (or WC_KEY/WC_SECRET)."
    );
  }

  // Ensure no leading / and no accidental wp-json duplication
  const cleaned = wpEndpoint
    .replace(/^\/+/, "")
    .replace(/^wp-json\/?/i, "");

  const url = `${wpBase}/wp-json/${cleaned}`;

  // Use query-string auth for WP/WCFM routes (commonly works)
  const authParams = { consumer_key, consumer_secret };

  if (method === "get") {
    const res = await axios.get(url, {
      params: { ...(payload?.params || {}), ...authParams },
      timeout: 30000,
    });
    return res.data;
  }

  if (method === "post") {
    const res = await axios.post(url, payload?.data ?? {}, {
      params: authParams,
      timeout: 30000,
    });
    return res.data;
  }

  if (method === "put") {
    const res = await axios.put(url, payload?.data ?? {}, {
      params: authParams,
      timeout: 30000,
    });
    return res.data;
  }

  if (method === "delete") {
    const res = await axios.delete(url, {
      params: { ...(payload?.params || {}), ...authParams },
      timeout: 30000,
    });
    return res.data;
  }

  throw new Error("Unsupported method");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProxyBody;
    const { method, endpoint, payload } = body;

    if (!method || !endpoint) {
      return NextResponse.json(
        { message: "Missing method or endpoint" },
        { status: 400 }
      );
    }

    // ✅ WP/WCFM route support (prefix: wp:)
    // Example: endpoint = "wp:wcfmmp/v1/vendors/35"
    if (endpoint.startsWith("wp:")) {
      const wpEndpoint = endpoint.replace(/^wp:/, "");
      const data = await callWpJson(method, wpEndpoint, payload);

      return NextResponse.json(data, {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    // ✅ Normal WooCommerce (wc/v3) proxying
    let response: any;

    if (method === "get") {
      response = await wcApi.get(endpoint, payload?.params);
    } else if (method === "post") {
      response = await wcApi.post(endpoint, payload?.data);
    } else if (method === "put") {
      response = await wcApi.put(endpoint, payload?.data);
    } else if (method === "delete") {
      response = await wcApi.delete(endpoint, payload?.params);
    } else {
      return NextResponse.json({ message: "Unsupported method" }, { status: 400 });
    }

    return NextResponse.json(response.data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    handleApiError(error);

    const status = error?.response?.status || 500;

    // Better messaging for axios/WP errors
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "WooCommerce/WP proxy failed";

    return NextResponse.json(
      {
        message,
        details: error?.response?.data || null,
      },
      { status }
    );
  }
}