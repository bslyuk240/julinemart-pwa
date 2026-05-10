/* global importScripts, firebase, self, clients */

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const JULINEMART_ICON = '/icon-192.png';
const JULINEMART_BADGE = '/favicon-96x96.png';
const DEFAULT_CLICK_PATH = '/';
let initPromise = null;

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
  const targetPath = resolveTargetPath(payloadData) || DEFAULT_CLICK_PATH;

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
      icon: JULINEMART_ICON,
      badge: JULINEMART_BADGE,
      tag: payloadData.type || 'julinemart-notification',
      renotify: true,
      data: {
        ...payloadData,
        targetPath,
      },
    },
  };
}

async function initFirebaseMessaging() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const response = await fetch(
      `${self.location.origin}/api/notifications/firebase-config`,
      {
        cache: 'no-store',
      }
    );

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
      const { title, options } = buildNotification(messagePayload);

      // Chrome/Android: FCM displays notification messages natively, so skip
      // to avoid duplicates. iOS Safari PWA: FCM never displays natively —
      // the service worker must always call showNotification.
      const hasManagedNotification = Boolean(
        messagePayload?.notification?.title || messagePayload?.notification?.body
      );
      const ua = (self.navigator && self.navigator.userAgent) || '';
      const isIOS = /iPhone|iPad|iPod/.test(ua);

      if (hasManagedNotification && !isIOS) {
        return;
      }

      self.registration.showNotification(title, options);
    });
  })().catch((error) => {
    console.error('firebase-messaging-sw init error:', error);
  });

  return initPromise;
}

void initFirebaseMessaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = toStringMap(event.notification.data || {});
  const targetPath = resolveTargetPath(data) || DEFAULT_CLICK_PATH;
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
