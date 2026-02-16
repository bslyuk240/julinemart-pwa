// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'node:crypto';

type SendPayload = {
  customerId?: string | number;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  type?: string;
};

type ServiceAccountConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
};

const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const GOOGLE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function toBase64Url(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getServiceAccountConfig(): ServiceAccountConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKeyRaw) {
    throw new Error(
      'Missing Firebase service account env vars. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  return {
    projectId,
    clientEmail,
    // Netlify/env files usually store newlines as \n.
    privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
  };
}

function createServiceAccountJwt(config: ServiceAccountConfig) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: config.clientEmail,
    scope: GOOGLE_OAUTH_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedJwt = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign('RSA-SHA256');
  signer.update(unsignedJwt);
  signer.end();
  const signature = signer.sign(config.privateKey);

  return `${unsignedJwt}.${toBase64Url(signature)}`;
}

async function getGoogleAccessToken(config: ServiceAccountConfig) {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs - 60_000 > now) {
    return cachedAccessToken.token;
  }

  const assertion = createServiceAccountJwt(config);
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const raw = await tokenRes.text();
  if (!tokenRes.ok) {
    throw new Error(`Failed to get Google access token: HTTP ${tokenRes.status} ${raw}`);
  }

  let parsed: GoogleTokenResponse;
  try {
    parsed = JSON.parse(raw) as GoogleTokenResponse;
  } catch {
    throw new Error(`Token endpoint returned non-JSON response: ${raw}`);
  }

  if (!parsed.access_token || !parsed.expires_in) {
    throw new Error(`Token endpoint response missing access_token/expires_in: ${raw}`);
  }

  cachedAccessToken = {
    token: parsed.access_token,
    expiresAtMs: now + parsed.expires_in * 1000,
  };

  return parsed.access_token;
}

function normalizeDataPayload(data?: Record<string, unknown>) {
  if (!data) return undefined;

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    normalized[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return Object.keys(normalized).length ? normalized : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendPayload;
    const { customerId, title, message, data, type } = body;

    if (!customerId || !title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (customerId, title, message)' },
        { status: 400 }
      );
    }

    console.log(`Sending notification to customer ${customerId}`);
    console.log(`Title: ${title}`);
    console.log(`Type: ${type || 'general'}`);

    const tokensResponse = await fetch(
      `${request.nextUrl.origin}/api/notifications/register-device?customerId=${customerId}`,
      { method: 'GET' }
    );
    const tokensData = (await tokensResponse.json()) as {
      success?: boolean;
      tokens?: string[];
    };

    if (!tokensData.success || !tokensData.tokens || tokensData.tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No devices registered for this customer',
      });
    }

    const serviceAccount = getServiceAccountConfig();
    const accessToken = await getGoogleAccessToken(serviceAccount);
    const normalizedData = normalizeDataPayload({
      type: type || 'general',
      ...(data || {}),
    });

    const results = await Promise.allSettled(
      tokensData.tokens.map(async (token) => {
        const fcmPayload = {
          message: {
            token,
            notification: {
              title,
              body: message,
            },
            data: normalizedData,
            android: {
              priority: 'HIGH',
              notification: {
                sound: 'default',
                color: '#77088a',
              },
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.projectId}/messages:send`,
          {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(fcmPayload),
        }
        );

        const rawText = await response.text();
        if (!response.ok) {
          throw new Error(`FCM HTTP ${response.status}: ${rawText || response.statusText}`);
        }

        let parsed: { name?: string };
        try {
          parsed = JSON.parse(rawText) as { name?: string };
        } catch {
          throw new Error(`FCM returned non-JSON response: ${rawText}`);
        }

        return {
          token,
          messageId: parsed.name || null,
        };
      })
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureReasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    const failureCount = failureReasons.length;

    if (successCount === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'FCM rejected all target tokens',
          sent: 0,
          failed: failureCount,
          totalDevices: tokensData.tokens.length,
          errors: failureReasons,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: failureCount === 0,
      message: failureCount === 0 ? 'Notifications sent' : 'Notifications partially sent',
      sent: successCount,
      failed: failureCount,
      totalDevices: tokensData.tokens.length,
      errors: failureReasons,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notification';
    console.error('Send notification error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
