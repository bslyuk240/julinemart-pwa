'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  RefreshCcw,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCustomerAuth } from '@/context/customer-auth-context';

import PageLoading from '@/components/ui/page-loading';
import AccountPageHeader from '@/components/account/account-page-header';
import {
  WEB_PUSH_ENABLE_EVENT,
  type WebPushEnableResult,
} from '@/lib/web-push-events';

type RegisterTokensResponse = {
  success?: boolean;
  tokens?: string[];
  count?: number;
  updatedAt?: string | null;
  message?: string;
};

type CleanupResponse = {
  success?: boolean;
  message?: string;
};

type NotificationPreferences = {
  orderUpdates: boolean;
  promotions: boolean;
  productAlerts: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  productAlerts: true,
};

const PREFERENCES_STORAGE_KEY = 'jm_notification_preferences';
const PENDING_TOKEN_STORAGE_KEY = 'jm_pending_fcm_token';
const LAST_TOKEN_STORAGE_KEY = 'jm_last_fcm_token';

function maskToken(token: string) {
  if (token.length <= 20) return token;
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

export default function AccountNotificationsPage() {
  const router = useRouter();
  const { user, customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();
  const customerId = user?.id ?? null;

  const [pageLoading, setPageLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [removingDevice, setRemovingDevice] = useState(false);
  const [isNativePlatform, setIsNativePlatform] = useState(false);
  const [registeredTokens, setRegisteredTokens] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [currentDeviceToken, setCurrentDeviceToken] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  const detectNativePlatform = useCallback(async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      setIsNativePlatform(Capacitor.isNativePlatform());
    } catch {
      setIsNativePlatform(false);
    }
  }, []);

  const syncLocalDeviceToken = useCallback(() => {
    if (typeof window === 'undefined') return;
    const lastKnownToken = localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
    const pendingToken = localStorage.getItem(PENDING_TOKEN_STORAGE_KEY);
    setCurrentDeviceToken(lastKnownToken || pendingToken || null);
  }, []);

  const loadRegistrationStatus = useCallback(async () => {
    if (!customerId) return;

    setLoadingStatus(true);
    try {
      const response = await fetch(
        `/api/notifications/register-device?customerId=${customerId}`
      );
      const payload = (await response.json().catch(() => null)) as
        | RegisterTokensResponse
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || `Failed to load notification status`);
      }

      const tokens = Array.isArray(payload.tokens)
        ? payload.tokens.filter((token): token is string => Boolean(token))
        : [];

      setRegisteredTokens(tokens);
      setUpdatedAt(payload.updatedAt || null);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load notification status';
      toast.error(message);
      setRegisteredTokens([]);
      setUpdatedAt(null);
    } finally {
      syncLocalDeviceToken();
      await detectNativePlatform();
      setLoadingStatus(false);
      setPageLoading(false);
    }
  }, [customerId, detectNativePlatform, syncLocalDeviceToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
      setPreferences({
        orderUpdates:
          typeof parsed.orderUpdates === 'boolean'
            ? parsed.orderUpdates
            : DEFAULT_PREFERENCES.orderUpdates,
        promotions:
          typeof parsed.promotions === 'boolean'
            ? parsed.promotions
            : DEFAULT_PREFERENCES.promotions,
        productAlerts:
          typeof parsed.productAlerts === 'boolean'
            ? parsed.productAlerts
            : DEFAULT_PREFERENCES.productAlerts,
      });
    } catch {
      setPreferences(DEFAULT_PREFERENCES);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !customerId) {
        setPageLoading(false);
        router.push('/login?redirect=/account/notifications');
      } else {
        loadRegistrationStatus();
      }
    }
  }, [authLoading, isAuthenticated, customerId, loadRegistrationStatus, router]);

  const thisDeviceRegistered = useMemo(() => {
    if (!currentDeviceToken) return false;
    return registeredTokens.includes(currentDeviceToken);
  }, [currentDeviceToken, registeredTokens]);

  const handleRegisterThisDevice = async () => {
    if (!customerId) return;

    setRegisteringDevice(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        toast.error('Push registration is available only in the Android app.');
        return;
      }

      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permissions = await PushNotifications.requestPermissions();
      if (permissions.receive !== 'granted') {
        toast.error('Notification permission is denied on this device.');
        return;
      }

      type ListenerHandle = { remove: () => Promise<void> } | null;
      let registrationHandle: ListenerHandle = null;
      let errorHandle: ListenerHandle = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const tokenValue = await new Promise<string>(async (resolve, reject) => {
        const cleanup = async () => {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (registrationHandle) {
            await registrationHandle.remove();
            registrationHandle = null;
          }
          if (errorHandle) {
            await errorHandle.remove();
            errorHandle = null;
          }
        };

        registrationHandle = await PushNotifications.addListener(
          'registration',
          async (token) => {
            await cleanup();
            resolve(token.value);
          }
        );

        errorHandle = await PushNotifications.addListener(
          'registrationError',
          async (error) => {
            await cleanup();
            const reason =
              error && typeof error === 'object'
                ? JSON.stringify(error)
                : String(error);
            reject(new Error(reason));
          }
        );

        timeoutId = setTimeout(async () => {
          await cleanup();
          reject(new Error('Timed out while waiting for push token'));
        }, 20_000);

        try {
          await PushNotifications.register();
        } catch (error) {
          await cleanup();
          reject(error);
        }
      });

      const response = await fetch('/api/notifications/register-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          fcmToken: tokenValue,
          platform: 'android',
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | RegisterTokensResponse
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to register this device');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem(LAST_TOKEN_STORAGE_KEY, tokenValue);
        localStorage.removeItem(PENDING_TOKEN_STORAGE_KEY);
      }

      setCurrentDeviceToken(tokenValue);
      toast.success('This device is now registered for notifications.');
      await loadRegistrationStatus();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to register this device';
      toast.error(message);
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (!customerId) return;

    setRegisteringDevice(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        toast.error('Browser notification setup is available only on web.');
        return;
      }

      const result = await Promise.race([
        new Promise<WebPushEnableResult>((resolve) => {
          window.dispatchEvent(
            new CustomEvent(WEB_PUSH_ENABLE_EVENT, {
              detail: { resolve },
            })
          );
        }),
        new Promise<WebPushEnableResult>((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: false,
                message: 'Web push setup timed out. Please try again.',
              }),
            20_000
          )
        ),
      ]);

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to enable browser notifications on this device'
        );
      }

      toast.success('Browser notifications enabled on this device.');
      await loadRegistrationStatus();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to enable browser notifications';
      toast.error(message);
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleDisableThisDevice = async () => {
    if (!customerId || !currentDeviceToken) {
      toast.error('No local device token found.');
      return;
    }

    setRemovingDevice(true);
    try {
      const response = await fetch(
        `/api/notifications/cleanup-tokens?customerId=${customerId}&fcmToken=${encodeURIComponent(
          currentDeviceToken
        )}`,
        { method: 'DELETE' }
      );
      const payload = (await response.json().catch(() => null)) as
        | CleanupResponse
        | null;

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to disable this device');
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem(LAST_TOKEN_STORAGE_KEY);
        localStorage.removeItem(PENDING_TOKEN_STORAGE_KEY);
      }

      setCurrentDeviceToken(null);
      toast.success('Notifications disabled on this device.');
      await loadRegistrationStatus();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to disable this device';
      toast.error(message);
    } finally {
      setRemovingDevice(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (authLoading || pageLoading) {
    return <PageLoading text="Loading notification settings..." />;
  }

  if (!isAuthenticated || !customer) {
    return (
      <main className="min-h-screen bg-gray-50 pb-24 md:pb-8 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-5 text-center max-w-md">
          <h1 className="text-base md:text-xl font-bold text-gray-900 mb-2">Sign in required</h1>
          <p className="text-sm text-gray-600 mb-4">
            Please log in to manage notification preferences.
          </p>
          <Link href="/login?redirect=/account/notifications">
            <Button variant="primary" size="sm">Go to Login</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-5 md:py-6 max-w-4xl">
        <AccountPageHeader
          title="Notifications"
          subtitle="Manage device registration and notification preferences."
          action={(
            <button
              type="button"
              onClick={loadRegistrationStatus}
              disabled={loadingStatus}
              aria-label="Refresh status"
              className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 text-gray-600 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          )}
        />

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4 md:mb-6">
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="grid md:grid-cols-3 gap-3 md:gap-4">
              <div className="border border-gray-200 rounded-xl p-3 md:p-4">
                <p className="text-sm text-gray-600 mb-1">Registered Devices</p>
                <p className="text-lg md:text-xl font-bold text-gray-900">
                  {registeredTokens.length}
                </p>
              </div>

              <div className="border border-gray-200 rounded-xl p-3 md:p-4">
                <p className="text-sm text-gray-600 mb-1">This Device</p>
                <div className="flex items-center gap-2">
                  {thisDeviceRegistered ? (
                    <>
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700">Registered</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-amber-700">Not Registered</span>
                    </>
                  )}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3 md:p-4">
                <p className="text-sm text-gray-600 mb-1">Last Backend Update</p>
                <p className="font-semibold text-gray-900">
                  {updatedAt
                    ? new Date(updatedAt).toLocaleString('en-US')
                    : 'No registration yet'}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-800 mb-2">Current Device Token</p>
              <p className="text-sm text-gray-700">
                {currentDeviceToken ? maskToken(currentDeviceToken) : 'Not detected on this device'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Push notifications are supported on both Android app and compatible browsers.
              </p>
            </div>

            {!isNativePlatform && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900">
                  You are on web. Tap &quot;Enable Browser Notifications&quot; to request
                  permission and register this browser.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
              {isNativePlatform ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRegisterThisDevice}
                  isLoading={registeringDevice}
                >
                  <Smartphone className="w-3.5 h-3.5 mr-1.5" />
                  Register This Device
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleEnableBrowserNotifications}
                  isLoading={registeringDevice}
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5" />
                  Enable Notifications
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisableThisDevice}
                disabled={!currentDeviceToken}
                isLoading={removingDevice}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Disable on This Device
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-4 md:p-8">
          <h2 className="text-sm md:text-base font-semibold text-gray-900 mb-2">
            Preference Controls
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            These controls are saved locally on this device for UI preference. Server-side
            targeting rules can be added later if you want these to be enforced during sends.
          </p>

          <div className="space-y-4">
            <label className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900">Order Updates</p>
                <p className="text-sm text-gray-600">
                  Delivery progress, payment confirmations, and order state changes.
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={preferences.orderUpdates}
                onChange={() => togglePreference('orderUpdates')}
              />
            </label>

            <label className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900">Promotions</p>
                <p className="text-sm text-gray-600">
                  Campaign announcements and special discount alerts.
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={preferences.promotions}
                onChange={() => togglePreference('promotions')}
              />
            </label>

            <label className="flex items-start justify-between gap-4 border border-gray-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900">Product Alerts</p>
                <p className="text-sm text-gray-600">
                  Product recommendations and restock notifications.
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 mt-1"
                checked={preferences.productAlerts}
                onChange={() => togglePreference('productAlerts')}
              />
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
