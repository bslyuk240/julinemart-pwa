// src/app/api/notifications/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'node:crypto';
import { getSupabaseServerClient } from '@/lib/supabase-server';

type SendPayload = {
  audience?: 'single' | 'all_customers' | 'all_vendors' | 'all_staff' | 'segment';
  customerId?: string | number;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  type?: string;
  segment?: {
    platform?: 'android' | 'web';
  };
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
type Audience = NonNullable<SendPayload['audience']>;

type DeviceTokenRow = {
  fcm_token?: string | null;
};

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
const SUPPORTED_AUDIENCES: Audience[] = [
  'single',
  'all_customers',
  'all_vendors',
  'all_staff',
  'segment',
];
const SUPPORTED_SEGMENT_PLATFORMS = new Set(['android', 'web']);

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

function parseAudience(value: unknown) {
  if (typeof value !== 'string') return null;
  return SUPPORTED_AUDIENCES.includes(value as Audience) ? (value as Audience) : null;
}

function resolveAudience(payload: SendPayload) {
  if (payload.audience) {
    return parseAudience(payload.audience);
  }
  return payload.customerId ? 'single' : null;
}

function parseSegmentPlatform(value: unknown) {
  if (typeof value !== 'string') return null;
  return SUPPORTED_SEGMENT_PLATFORMS.has(value) ? value : null;
}

function dedupeTokens(tokens: string[]) {
  return [...new Set(tokens.map((token) => token.trim()).filter(Boolean))];
}

function isAdminRequest(request: NextRequest) {
  const configuredSecret = process.env.NOTIFICATIONS_ADMIN_SECRET;
  if (!configuredSecret) return false;
  return request.headers.get('x-notifications-admin-secret') === configuredSecret;
}

function isMissingColumnError(error: unknown, columnName: string) {
  if (!error || typeof error !== 'object') return false;
  const maybeMessage =
    'message' in error && typeof error.message === 'string' ? error.message : '';
  const maybeDetails =
    'details' in error && typeof error.details === 'string' ? error.details : '';
  const combined = `${maybeMessage} ${maybeDetails}`.toLowerCase();
  return combined.includes('column') && combined.includes(columnName.toLowerCase());
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

async function cleanupInvalidTokens(
  audience: Audience,
  customerId: string | number | undefined,
  tokens: string[]
) {
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

  let deleteQuery = supabase.from('device_tokens').delete().in('fcm_token', tokens);
  if (audience === 'single' && customerId !== undefined) {
    deleteQuery = deleteQuery.eq('customer_id', customerId);
  }

  const { data, error } = await deleteQuery.select('fcm_token');

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

function resolveWebLinkPath(data?: Record<string, string>) {
  if (!data) return '/';

  const targetPath = data.targetPath;
  if (targetPath) {
    if (targetPath.startsWith('/')) return targetPath;
    try {
      const parsed = new URL(targetPath);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return '/';
    }
  }

  if (data.type === 'order_update' && data.orderId) {
    return `/orders/${data.orderId}`;
  }

  if (data.type === 'product' && data.productSlug) {
    return `/product/${data.productSlug}`;
  }

  if (data.type === 'promotion') {
    return '/products';
  }

  return '/';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SendPayload;
    const { customerId, title, message, data, type, segment } = body;
    const audience = resolveAudience(body);

    if (!audience) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Missing or invalid audience. Provide audience or keep backward-compatible customerId payload for single sends.',
        },
        { status: 400 }
      );
    }

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields (title, message)' },
        { status: 400 }
      );
    }

    if (audience === 'single' && !customerId) {
      return NextResponse.json(
        {
          success: false,
          audience,
          message: 'Missing customerId for audience=single',
        },
        { status: 400 }
      );
    }

    if (audience === 'segment' && segment?.platform) {
      const parsedPlatform = parseSegmentPlatform(segment.platform);
      if (!parsedPlatform) {
        return NextResponse.json(
          {
            success: false,
            audience,
            message: 'Invalid segment.platform. Supported values: android, web',
          },
          { status: 400 }
        );
      }
    }

    if (audience !== 'single') {
      const adminSecret = process.env.NOTIFICATIONS_ADMIN_SECRET;
      if (!adminSecret) {
        return NextResponse.json(
          {
            success: false,
            audience,
            message:
              'Bulk notifications are disabled because NOTIFICATIONS_ADMIN_SECRET is not configured.',
          },
          { status: 500 }
        );
      }

      if (!isAdminRequest(request)) {
        return NextResponse.json(
          {
            success: false,
            audience,
            message: 'Unauthorized bulk notification request',
          },
          { status: 401 }
        );
      }
    }

    console.log(`Sending notification for audience ${audience}`);
    if (audience === 'single') {
      console.log(`Target customer ${customerId}`);
    }
    console.log(`Title: ${title}`);
    console.log(`Type: ${type || 'general'}`);

    let targetTokens: string[] = [];

    if (audience === 'single') {
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
            audience,
            message:
              tokensData.message ||
              `Failed to load device tokens (HTTP ${tokensResponse.status})`,
          },
          { status: 502 }
        );
      }

      targetTokens = tokensData.tokens || [];
    } else {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return NextResponse.json(
          {
            success: false,
            audience,
            message: 'Supabase environment variables are not configured',
          },
          { status: 500 }
        );
      }

      if (audience === 'all_customers') {
        const { data: tokenRows, error } = await supabase
          .from('device_tokens')
          .select('fcm_token')
          .eq('user_type', 'customer');

        if (error) {
          throw new Error(`Database error: ${error.message}`);
        }

        targetTokens = (tokenRows || [])
          .map((row: DeviceTokenRow) => row.fcm_token || '')
          .filter(Boolean);
      } else if (audience === 'segment') {
        if (!segment?.platform) {
          return NextResponse.json(
            {
              success: false,
              audience,
              message:
                'segment.platform is required for audience=segment in this MVP',
            },
            { status: 400 }
          );
        }

        const segmentPlatform = parseSegmentPlatform(segment.platform);
        if (!segmentPlatform) {
          return NextResponse.json(
            {
              success: false,
              audience,
              message: 'Invalid segment.platform. Supported values: android, web',
            },
            { status: 400 }
          );
        }

        const { data: tokenRows, error } = await supabase
          .from('device_tokens')
          .select('fcm_token')
          .eq('platform', segmentPlatform);

        if (error) {
          if (isMissingColumnError(error, 'platform')) {
            return NextResponse.json(
              {
                success: false,
                audience,
                message:
                  "device_tokens.platform column is required for audience=segment. Add a 'platform' column to use platform-based segments.",
              },
              { status: 400 }
            );
          }
          throw new Error(`Database error: ${error.message}`);
        }

        targetTokens = (tokenRows || [])
          .map((row: DeviceTokenRow) => row.fcm_token || '')
          .filter(Boolean);
      } else if (audience === 'all_vendors' || audience === 'all_staff') {
        const targetUserType = audience === 'all_vendors' ? 'vendor' : 'staff';
        const { data: tokenRows, error } = await supabase
          .from('device_tokens')
          .select('fcm_token')
          .eq('user_type', targetUserType);

        if (error) {
          if (isMissingColumnError(error, 'user_type')) {
            return NextResponse.json(
              {
                success: false,
                audience,
                message:
                  "device_tokens.user_type column is required for vendor/staff audiences. Add a 'user_type' column to use all_vendors/all_staff.",
              },
              { status: 400 }
            );
          }
          throw new Error(`Database error: ${error.message}`);
        }

        targetTokens = (tokenRows || [])
          .map((row: DeviceTokenRow) => row.fcm_token || '')
          .filter(Boolean);
      }
    }

    const dedupedTokens = dedupeTokens(targetTokens);
    const matchedTokensCount = dedupedTokens.length;

    if (matchedTokensCount === 0) {
      return NextResponse.json({
        success: false,
        audience,
        message:
          audience === 'single'
            ? 'No devices registered for this customer'
            : 'No devices matched the selected audience',
        matchedTokensCount: 0,
        sent: 0,
        failed: 0,
        totalDevices: 0,
        invalidTokenCount: 0,
        cleanedUpInvalidTokens: 0,
        errors: [],
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
    const webLinkPath = resolveWebLinkPath(normalizedData);
    // Use the configured storefront origin so notification clicks always open
    // the customer PWA, not the server's own hostname (which may differ).
    const storefrontOrigin =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin;
    const webLinkUrl = new URL(webLinkPath, storefrontOrigin).toString();

    const results: TokenSendResult[] = await Promise.all(
      dedupedTokens.map(async (token) => {
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
                webpush: {
                  headers: {
                    Urgency: 'high',
                    TTL: '2419200',
                  },
                  notification: {
                    title,
                    body: message,
                    icon: '/icon-192.png',
                    badge: '/favicon-96x96.png',
                  },
                  fcm_options: {
                    link: webLinkUrl,
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
      audience,
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
          audience,
          message: allFailuresAreInvalidTokens
            ? 'All registered device tokens are invalid or expired. Ask the user to open the app and sign in again to refresh push token registration.'
            : 'FCM rejected all target tokens',
          matchedTokensCount,
          sent: 0,
          failed: failureCount,
          totalDevices: matchedTokensCount,
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
      audience,
      message: failureCount === 0 ? 'Notifications sent' : 'Notifications partially sent',
      matchedTokensCount,
      sent: successCount,
      failed: failureCount,
      totalDevices: matchedTokensCount,
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

/*
Env note:
- NOTIFICATIONS_ADMIN_SECRET is required for non-single audiences
  (all_customers, all_vendors, all_staff, segment).

Quick test plan:
1) Single send: POST with { customerId, title, message } and no admin header -> should work.
2) Bulk no secret header: POST with { audience: "all_customers", title, message } -> should return 401 (or 500 if NOTIFICATIONS_ADMIN_SECRET is not configured).
3) Bulk with secret: same request + x-notifications-admin-secret header -> should send.
4) Segment filter: POST with { audience: "segment", segment: { platform: "android" }, title, message } + admin header -> should send/filter.
*/
