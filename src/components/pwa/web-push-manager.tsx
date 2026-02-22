'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';
import {
  getFirebaseWebMessaging,
  getFirebaseWebRuntimeConfig,
} from '@/lib/firebase-web';
import {
  WEB_PUSH_ENABLE_EVENT,
  type WebPushEnableResult,
} from '@/lib/web-push-events';

const PENDING_TOKEN_STORAGE_KEY = 'jm_pending_fcm_token';
const LAST_TOKEN_STORAGE_KEY = 'jm_last_fcm_token';

function toStringMap(input?: Record<string, unknown>) {
  const result: Record<string, string> = {};
  if (!input) return result;

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === 'string' ? value : String(value);
  }

  return result;
}

function normalizeTargetPath(value: string) {
  if (!value) return null;
  if (value.startsWith('/')) return value;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function resolveTargetPath(data: Record<string, string>) {
  if (data.targetPath) {
    const normalized = normalizeTargetPath(data.targetPath);
    if (normalized) return normalized;
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

  return null;
}

export default function WebPushManager() {
  const router = useRouter();
  const { customer, customerId, isAuthenticated, isLoading } = useCustomerAuth();
  const registrationCacheRef = useRef<string | null>(null);
  const onMessageCleanupRef = useRef<(() => void) | null>(null);
  const inFlightSetupRef = useRef<Promise<WebPushEnableResult> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposed = false;

    const registerTokenForCustomer = async (tokenValue: string) => {
      const activeCustomerId = customerId ?? customer?.id;
      if (!activeCustomerId) {
        localStorage.setItem(PENDING_TOKEN_STORAGE_KEY, tokenValue);
        return {
          success: false,
          message: 'Push token is pending until customer sign-in completes.',
        } satisfies WebPushEnableResult;
      }

      const registrationKey = `${activeCustomerId}:${tokenValue}`;
      if (registrationCacheRef.current === registrationKey) {
        return { success: true } satisfies WebPushEnableResult;
      }

      try {
        const response = await fetch('/api/notifications/register-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: activeCustomerId,
            fcmToken: tokenValue,
            platform: 'web',
          }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          const reason = payload?.message || `HTTP ${response.status}`;
          throw new Error(reason);
        }

        localStorage.removeItem(PENDING_TOKEN_STORAGE_KEY);
        localStorage.setItem(LAST_TOKEN_STORAGE_KEY, tokenValue);
        registrationCacheRef.current = registrationKey;
        return { success: true } satisfies WebPushEnableResult;
      } catch (error: unknown) {
        localStorage.setItem(PENDING_TOKEN_STORAGE_KEY, tokenValue);
        const reason =
          error instanceof Error ? error.message : 'Failed to register token on backend';
        return { success: false, message: reason } satisfies WebPushEnableResult;
      }
    };

    const ensureWebPushSetup = async (interactivePermissionRequest: boolean) => {
      if (inFlightSetupRef.current) {
        return inFlightSetupRef.current;
      }

      inFlightSetupRef.current = (async () => {
        try {
          const { Capacitor } = await import('@capacitor/core');
          if (Capacitor.isNativePlatform()) {
            return {
              success: false,
              message: 'Native platform detected; web push setup skipped.',
            } satisfies WebPushEnableResult;
          }

          if (!isAuthenticated || !(customerId ?? customer?.id)) {
            return {
              success: false,
              message: 'Sign in required before enabling browser notifications.',
            } satisfies WebPushEnableResult;
          }

          if (
            !('Notification' in window) ||
            !('serviceWorker' in navigator) ||
            !('PushManager' in window)
          ) {
            return {
              success: false,
              message: 'This browser does not support web push notifications.',
            } satisfies WebPushEnableResult;
          }

          const messaging = await getFirebaseWebMessaging();
          if (!messaging) {
            return {
              success: false,
              message: 'Firebase messaging is not available in this browser.',
            } satisfies WebPushEnableResult;
          }

          const runtimeConfig = await getFirebaseWebRuntimeConfig();
          if (!runtimeConfig) {
            return {
              success: false,
              message: 'Firebase web push config is unavailable.',
            } satisfies WebPushEnableResult;
          }

          const swRegistration = await navigator.serviceWorker.register(
            '/firebase-messaging-sw.js'
          );

          let permission = Notification.permission;
          if (permission === 'default' && interactivePermissionRequest) {
            permission = await Notification.requestPermission();
          }

          if (permission === 'denied') {
            return {
              success: false,
              message:
                'Notification permission is blocked in this browser. Enable it in site settings.',
            } satisfies WebPushEnableResult;
          }

          if (permission !== 'granted') {
            return {
              success: false,
              message: 'Notification permission has not been granted yet.',
            } satisfies WebPushEnableResult;
          }

          const vapidKey = runtimeConfig.vapidKey;
          if (!vapidKey) {
            return {
              success: false,
              message: 'Missing Firebase web push VAPID key.',
            } satisfies WebPushEnableResult;
          }

          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swRegistration,
          });

          if (!token) {
            return {
              success: false,
              message: 'Could not obtain a browser push token.',
            } satisfies WebPushEnableResult;
          }

          const tokenResult = await registerTokenForCustomer(token);
          if (!tokenResult.success) {
            return tokenResult;
          }

          if (!onMessageCleanupRef.current) {
            onMessageCleanupRef.current = onMessage(messaging, (payload) => {
              if (disposed) return;

              const data = toStringMap(payload.data as Record<string, unknown>);
              const targetPath = resolveTargetPath(data);
              const title = payload.notification?.title || 'JulineMart';
              const description =
                payload.notification?.body || data.message || 'You have a new update.';

              toast(title, {
                description,
                action: targetPath
                  ? {
                      label: 'View',
                      onClick: () => router.push(targetPath),
                    }
                  : undefined,
              });
            });
          }

          return { success: true } satisfies WebPushEnableResult;
        } catch (error: unknown) {
          const reason =
            error instanceof Error ? error.message : 'Failed to initialize web push.';
          return { success: false, message: reason } satisfies WebPushEnableResult;
        } finally {
          inFlightSetupRef.current = null;
        }
      })();

      return inFlightSetupRef.current;
    };

    const rebindLocalTokenIfAvailable = async () => {
      const activeCustomerId = customerId ?? customer?.id;
      if (!activeCustomerId) return;

      const pendingToken = localStorage.getItem(PENDING_TOKEN_STORAGE_KEY);
      if (pendingToken) {
        await registerTokenForCustomer(pendingToken);
      }

      const lastKnownToken = localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
      if (lastKnownToken) {
        await registerTokenForCustomer(lastKnownToken);
      }
    };

    const handleEnableRequest = async (
      event: Event
    ) => {
      const customEvent = event as CustomEvent<{
        resolve?: (result: WebPushEnableResult) => void;
      }>;
      const result = await ensureWebPushSetup(true);
      customEvent.detail?.resolve?.(result);
    };

    window.addEventListener(
      WEB_PUSH_ENABLE_EVENT,
      handleEnableRequest as EventListener
    );

    if (!isLoading) {
      void rebindLocalTokenIfAvailable();
      // Non-interactive boot: if permission was already granted, token registration proceeds.
      void ensureWebPushSetup(false);
    }

    return () => {
      disposed = true;
      window.removeEventListener(
        WEB_PUSH_ENABLE_EVENT,
        handleEnableRequest as EventListener
      );
      if (onMessageCleanupRef.current) {
        onMessageCleanupRef.current();
        onMessageCleanupRef.current = null;
      }
    };
  }, [customer, customerId, isAuthenticated, isLoading, router]);

  return null;
}
