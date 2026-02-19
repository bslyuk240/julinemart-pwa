// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

type LegacyFcmResponse = {
  success?: number;
  failure?: number;
  results?: Array<{
    message_id?: string;
    error?: string;
  }>;
};

type FcmErrorPayload = {
  error?: {
    code?: number;
    status?: string;
    message?: string;
    details?: Array<{
      '@type'?: string;
      errorCode?: string;
    }>;
  };
};

type TokenSendSuccess = {
  ok: true;
  token: string;
  messageId: string | null;
};

type TokenSendFailure = {
  ok: false;
  token: string;
  tokenPreview: string;
  httpStatus: number;
  fcmStatus?: string;
  fcmErrorCode?: string;
  message: string;
  invalidToken: boolean;
};

type TokenSendResult = TokenSendSuccess | TokenSendFailure;

const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';
const GOOGLE_OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const INVALID_TOKEN_ERROR_CODES = new Set([
  'UNREGISTERED',
  'INVALID_REGISTRATION',
  'REGISTRATION_TOKEN_NOT_REGISTERED',
]);
const LEGACY_INVALID_TOKEN_ERROR_CODES = new Set([
  'InvalidRegistration',
  'NotRegistered',
  'MissingRegistration',
]);

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

function hasServiceAccountConfig() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function getSupabaseClient() {
  try {
    return getSupabaseServerClient();
  } catch {
    return null;
  }
}

function getTokenPreview(token: string) {
  if (token.length <= 24) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

function parseFcmFailure(rawText: string, httpStatus: number) {
  let parsed: FcmErrorPayload | null = null;
  try {
    parsed = JSON.parse(rawText) as FcmErrorPayload;
  } catch {
    parsed = null;
  }

  const fcmStatus = parsed?.error?.status;
  const fcmErrorCode = parsed?.error?.details?.find((detail) => Boolean(detail?.errorCode))
    ?.errorCode;
  const message = parsed?.error?.message || rawText || `FCM HTTP ${httpStatus}`;
  const upperMessage = message.toUpperCase();

  const invalidByCode = Boolean(fcmErrorCode && INVALID_TOKEN_ERROR_CODES.has(fcmErrorCode));
  const invalidByMessage =
    upperMessage.includes('REGISTRATION TOKEN') &&
    (upperMessage.includes('NOT REGISTERED') ||
      upperMessage.includes('NOT VALID') ||
      upperMessage.includes('UNREGISTERED'));

  return {
    httpStatus,
    fcmStatus,
    fcmErrorCode,
    message,
    invalidToken: invalidByCode || invalidByMessage,
  };
}

function parseLegacyFcmFailure(rawText: string, httpStatus: number) {
  let parsed: LegacyFcmResponse | null = null;
  try {
    parsed = JSON.parse(rawText) as LegacyFcmResponse;
  } catch {
    parsed = null;
  }

  if (httpStatus === 404) {
    return {
      httpStatus,
      fcmStatus: 'LEGACY_FCM',
      fcmErrorCode: 'LEGACY_ENDPOINT_UNAVAILABLE',
      message:
        'Legacy FCM endpoint is unavailable (HTTP 404). Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to use FCM HTTP v1.',
      invalidToken: false,
    };
  }

  const errorCode = parsed?.results?.[0]?.error;
  const message = errorCode
    ? `Legacy FCM error: ${errorCode}`
    : rawText || `Legacy FCM HTTP ${httpStatus}`;

  return {
    httpStatus,
    fcmStatus: 'LEGACY_FCM',
    fcmErrorCode: errorCode,
    message,
    invalidToken: Boolean(
      errorCode && LEGACY_INVALID_TOKEN_ERROR_CODES.has(errorCode)
    ),
  };
}

async function cleanupInvalidTokens(customerId: string | number, tokens: string[]) {
  if (!tokens.length) {
    return { attempted: false, deleted: 0 as number, error: null as string | null };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      attempted: false,
      deleted: 0 as number,
      error: 'Supabase env vars are missing, cannot auto-clean stale device tokens',
    };
  }

  const { data, error } = await supabase
    .from('device_tokens')
    .delete()
    .eq('customer_id', customerId)
    .in('fcm_token', tokens)
    .select('fcm_token');

  if (error) {
    return {
      attempted: true,
      deleted: 0 as number,
      error: `Failed to remove stale tokens: ${error.message}`,
    };
  }

  return {
    attempted: true,
    deleted: data?.length ?? 0,
    error: null as string | null,
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
      message?: string;
      tokens?: string[];
    };

    if (!tokensResponse.ok || !tokensData.success) {
      return NextResponse.json(
        {
          success: false,
          message:
            tokensData.message ||
            `Failed to load device tokens (HTTP ${tokensResponse.status})`,
        },
        { status: 502 }
      );
    }

    if (!tokensData.success || !tokensData.tokens || tokensData.tokens.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No devices registered for this customer',
      });
    }

    const useFcmV1 = hasServiceAccountConfig();
    const legacyServerKey = process.env.FCM_SERVER_KEY;

    if (!useFcmV1 && !legacyServerKey) {
      throw new Error(
        'Missing Firebase configuration. Set FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY (HTTP v1) or FCM_SERVER_KEY (legacy).'
      );
    }

    const serviceAccount = useFcmV1 ? getServiceAccountConfig() : null;
    const accessToken = serviceAccount
      ? await getGoogleAccessToken(serviceAccount)
      : null;

    const normalizedData = normalizeDataPayload({
      type: type || 'general',
      ...(data || {}),
    });

    const results: TokenSendResult[] = await Promise.all(
      tokensData.tokens.map(async (token) => {
        try {
          if (useFcmV1 && serviceAccount && accessToken) {
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
              const parsedFailure = parseFcmFailure(rawText, response.status);
              return {
                ok: false,
                token,
                tokenPreview: getTokenPreview(token),
                ...parsedFailure,
              } satisfies TokenSendFailure;
            }

            let parsed: { name?: string };
            try {
              parsed = JSON.parse(rawText) as { name?: string };
            } catch {
              return {
                ok: false,
                token,
                tokenPreview: getTokenPreview(token),
                httpStatus: response.status,
                fcmStatus: undefined,
                fcmErrorCode: undefined,
                message: `FCM returned non-JSON response: ${rawText}`,
                invalidToken: false,
              } satisfies TokenSendFailure;
            }

            return {
              ok: true,
              token,
              messageId: parsed.name || null,
            } satisfies TokenSendSuccess;
          }

          const legacyPayload = {
            to: token,
            priority: 'high',
            notification: {
              title,
              body: message,
              sound: 'default',
            },
            data: normalizedData,
          };

          const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${legacyServerKey}`,
            },
            body: JSON.stringify(legacyPayload),
          });

          const rawText = await response.text();
          if (!response.ok) {
            const parsedFailure = parseLegacyFcmFailure(rawText, response.status);
            return {
              ok: false,
              token,
              tokenPreview: getTokenPreview(token),
              ...parsedFailure,
            } satisfies TokenSendFailure;
          }

          let parsed: LegacyFcmResponse;
          try {
            parsed = JSON.parse(rawText) as LegacyFcmResponse;
          } catch {
            return {
              ok: false,
              token,
              tokenPreview: getTokenPreview(token),
              httpStatus: response.status,
              fcmStatus: 'LEGACY_FCM',
              fcmErrorCode: undefined,
              message: `Legacy FCM returned non-JSON response: ${rawText}`,
              invalidToken: false,
            } satisfies TokenSendFailure;
          }

          const firstResult = parsed.results?.[0];
          if (firstResult?.error) {
            return {
              ok: false,
              token,
              tokenPreview: getTokenPreview(token),
              httpStatus: response.status,
              fcmStatus: 'LEGACY_FCM',
              fcmErrorCode: firstResult.error,
              message: `Legacy FCM error: ${firstResult.error}`,
              invalidToken: LEGACY_INVALID_TOKEN_ERROR_CODES.has(firstResult.error),
            } satisfies TokenSendFailure;
          }

          return {
            ok: true,
            token,
            messageId: firstResult?.message_id || null,
          } satisfies TokenSendSuccess;
        } catch (error: unknown) {
          const errMessage =
            error instanceof Error ? error.message : 'Unexpected send failure';
          return {
            ok: false,
            token,
            tokenPreview: getTokenPreview(token),
            httpStatus: 0,
            fcmStatus: undefined,
            fcmErrorCode: undefined,
            message: errMessage,
            invalidToken: false,
          } satisfies TokenSendFailure;
        }
      })
    );

    const successfulSends = results.filter(
      (result): result is TokenSendSuccess => result.ok
    );
    const failedSends = results.filter(
      (result): result is TokenSendFailure => !result.ok
    );

    const successCount = successfulSends.length;
    const failureCount = failedSends.length;
    const invalidFailures = failedSends.filter((result) => result.invalidToken);

    const cleanupResult = await cleanupInvalidTokens(
      customerId,
      invalidFailures.map((result) => result.token)
    );

    const errorDetails = failedSends.map((failure) => ({
      token: failure.tokenPreview,
      httpStatus: failure.httpStatus || null,
      status: failure.fcmStatus || null,
      errorCode: failure.fcmErrorCode || null,
      invalidToken: failure.invalidToken,
      message: failure.message,
    }));

    if (successCount === 0) {
      const allFailuresAreInvalidTokens =
        failureCount > 0 && invalidFailures.length === failureCount;

      return NextResponse.json(
        {
          success: false,
          message: allFailuresAreInvalidTokens
            ? 'All registered device tokens are invalid or expired. Ask the user to open the app and sign in again to refresh push token registration.'
            : 'FCM rejected all target tokens',
          sent: 0,
          failed: failureCount,
          totalDevices: tokensData.tokens.length,
          invalidTokenCount: invalidFailures.length,
          cleanedUpInvalidTokens: cleanupResult.deleted,
          cleanupWarning: cleanupResult.error,
          errors: errorDetails,
        },
        { status: allFailuresAreInvalidTokens ? 410 : 502 }
      );
    }

    return NextResponse.json({
      success: failureCount === 0,
      message: failureCount === 0 ? 'Notifications sent' : 'Notifications partially sent',
      sent: successCount,
      failed: failureCount,
      totalDevices: tokensData.tokens.length,
      invalidTokenCount: invalidFailures.length,
      cleanedUpInvalidTokens: cleanupResult.deleted,
      cleanupWarning: cleanupResult.error,
      errors: errorDetails,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send notification';
    console.error('Send notification error:', error);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
