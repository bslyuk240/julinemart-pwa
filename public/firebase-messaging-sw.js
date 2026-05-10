/* global importScripts, firebase, self, clients */

importScripts(
  `https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js`
);
importScripts(
  `https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js`
);

const JULINEMART_ICON = '/icon-192.png';
const JULINEMART_BADGE = '/favicon-96x96.png';

/** Path prefix for subpath installs (registration scope minus trailing slash). */
function scopePathPrefix() {
  try {
    if (self.registration?.scope) {
      const p = new URL(self.registration.scope).pathname.replace(/\/$/, '');
      return p ? p : '';
    }
  } catch (_) {
    /* noop */
  }
  return '';
}

function scopedAbsUrl(pathOrUrl) {
  if (
    typeof pathOrUrl !== 'string' ||
    pathOrUrl.startsWith('http://') ||
    pathOrUrl.startsWith('https://')
  ) {
    return pathOrUrl;
  }
  const prefix = scopePathPrefix();
  if (!prefix) return pathOrUrl;
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${prefix}${p}`.replace(/\/+/g, '/');
}

/** Absolute URLs avoid Android PWAs rejecting invalid relative icon URLs (breaks showNotification). */
function absoluteNotifyAssetUrl(relPath) {
  const localized = scopedAbsUrl(relPath);
  if (
    typeof localized !== 'string' ||
    localized.startsWith('http://') ||
    localized.startsWith('https://')
  ) {
    return localized;
  }
  return new URL(
    localized.startsWith('/') ? localized : `/${localized}`,
    self.location.origin
  ).href;
}

/** Prefix app paths when the SW is scoped under a subpath (e.g. /julinemart-pwa). */
function withScope(relPath) {
  const prefix = scopePathPrefix();
  if (!relPath || relPath === '/') {
    const root = prefix ? `${prefix}/` : '/';
    return root.replace(/\/+/g, '/');
  }
  const normalized = relPath.startsWith('/') ? relPath : `/${relPath}`;
  if (!prefix) return normalized;
  if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
    return normalized;
  }
  return `${prefix}${normalized}`.replace(/\/+/g, '/');
}

function firebaseConfigFetchUrl() {
  const prefix = scopePathPrefix();
  const path = prefix
    ? `${prefix}/api/notifications/firebase-config`
    : `/api/notifications/firebase-config`;
  return new URL(path, self.location.origin).href;
}
const DEFAULT_CLICK_PATH = '/';
let initPromise = null;
let lastShownSignature = null;
let lastShownAt = 0;

function toStringMap(input) {
  const result = {};
  if (!input || typeof input !== 'object') return result;

  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    result[key] = typeof value === 'string' ? value : String(value);
  });

  return result;
}

function normalizeTargetPath(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.startsWith('/')) return value;

  try {
    const parsed = new URL(value, self.location.origin);
    if (parsed.origin !== self.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function resolveTargetPath(data) {
  const targetPath = normalizeTargetPath(data.targetPath);
  if (targetPath) return targetPath;

  if (data.type === 'order_update' && data.orderId) {
    return `/orders/${data.orderId}`;
  }

  if (data.type === 'product' && data.productSlug) {
    return `/product/${data.productSlug}`;
  }

  if (data.type === 'promotion') {
    return '/products';
  }

  return null;
}

function buildNotification(payload) {
  const payloadData = toStringMap(payload && payload.data ? payload.data : {});
  const rawTarget = resolveTargetPath(payloadData) || DEFAULT_CLICK_PATH;
  const targetPath = withScope(rawTarget);

  const title =
    (payload && payload.notification && payload.notification.title) ||
    payloadData.title ||
    'JulineMart';
  const body =
    (payload && payload.notification && payload.notification.body) ||
    payloadData.body ||
    payloadData.message ||
    'You have a new update.';

  return {
    title,
    options: {
      body,
      icon: absoluteNotifyAssetUrl(JULINEMART_ICON),
      badge: absoluteNotifyAssetUrl(JULINEMART_BADGE),
      // Distinct tag helps Android avoid renotify edge cases; renotify can break some Chrome builds.
      tag: `${payloadData.type || 'jm'}-${Date.now().toString(36)}`,
      renotify: false,
      data: {
        ...payloadData,
        targetPath,
      },
    },
  };
}

function isDuplicateNotification(title, options) {
  const signature = `${String(title || '')}|${String(options?.body || '')}|${String(
    options?.data?.targetPath || ''
  )}`;
  const now = Date.now();
  const duplicate = signature === lastShownSignature && now - lastShownAt < 2500;
  if (!duplicate) {
    lastShownSignature = signature;
    lastShownAt = now;
  }
  return duplicate;
}

function showBuiltNotification(built) {
  const { title: nTitle, options } = built;
  if (isDuplicateNotification(nTitle, options)) {
    return Promise.resolve();
  }
  return self.registration.showNotification(nTitle, options).catch((showErr) => {
    console.error('[jm-sw] showNotification failed, retrying minimal:', showErr);
    return self.registration.showNotification(String(nTitle || 'JulineMart'), {
      body: String(options.body || 'You have a new update.'),
      data: options.data || {},
    });
  });
}

async function initFirebaseMessaging() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch(firebaseConfigFetchUrl(), {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`firebase-config fetch failed (HTTP ${response.status})`);
    }

    const payload = await response.json();
    if (!payload || !payload.success || !payload.config) {
      throw new Error('firebase-config response was missing config');
    }

    if (!firebase.apps.length) {
      firebase.initializeApp(payload.config);
    }

    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((messagePayload) => {
      try {
        const built = buildNotification(messagePayload);
        // Returning the promise keeps the SW alive until Chrome records the notification.
        return showBuiltNotification(built);
      } catch (err) {
        console.error('[jm-sw] background message handler error:', err, messagePayload);
        return self.registration.showNotification('JulineMart', {
          body: 'You have a new update.',
        });
      }
    });
  })();

  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }

  return initPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await initFirebaseMessaging().catch((e) =>
        console.error('[jm-sw] init during install:', e)
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await initFirebaseMessaging().catch((e) =>
        console.error('[jm-sw] init during activate:', e)
      );
      await self.clients.claim();
    })()
  );
});

void initFirebaseMessaging().catch((e) => console.error('[jm-sw] eager init:', e));

// Fallback: handle raw Push API payloads directly.
// This covers Android/Chrome cases where Firebase's onBackgroundMessage isn't invoked.
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const rawText = event.data ? event.data.text() : '';
        let payload = {};
        if (rawText) {
          try {
            payload = JSON.parse(rawText);
          } catch {
            payload = { data: { message: rawText } };
          }
        }
        const built = buildNotification(payload);
        await showBuiltNotification(built);
      } catch (error) {
        console.error('[jm-sw] push fallback handler failed:', error);
      }
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = toStringMap(event.notification.data || {});
  const rawTarget = resolveTargetPath(data) || DEFAULT_CLICK_PATH;
  const targetPath = withScope(rawTarget);
  const destination = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const activeClients = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of activeClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ('navigate' in client && client.url !== destination) {
          await client.navigate(destination);
        }

        return client.focus();
      }

      if (clients.openWindow) {
        return clients.openWindow(destination);
      }

      return undefined;
    })()
  );
});
