// src/components/native/push-notification-manager.tsx
'use client';

import { useEffect } from 'react';
import { useCustomerAuth } from '@/context/customer-auth-context';

export default function PushNotificationManager() {
  const { customer } = useCustomerAuth();
  // Default to enabled on native. Set NEXT_PUBLIC_ENABLE_NATIVE_PUSH=false to turn it off.
  const enableNativePush = process.env.NEXT_PUBLIC_ENABLE_NATIVE_PUSH !== 'false';

  useEffect(() => {
    let mounted = true;
    const pendingTokenKey = 'jm_pending_fcm_token';

    const setupPushNotifications = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) {
          console.log('Push notifications: Web platform detected, skipping setup');
          return;
        }

        if (!enableNativePush) {
          console.log('Push notifications: disabled via NEXT_PUBLIC_ENABLE_NATIVE_PUSH=false');
          return;
        }

        const { PushNotifications } = await import('@capacitor/push-notifications');
        console.log('Initializing push notifications...');

        const registerTokenForCustomer = async (tokenValue: string) => {
          if (!mounted) return;

          if (!customer) {
            localStorage.setItem(pendingTokenKey, tokenValue);
            console.log('Push token pending: waiting for signed-in customer');
            return;
          }

          try {
            const response = await fetch('/api/notifications/register-device', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: customer.id,
                fcmToken: tokenValue,
                platform: 'android',
              }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok || !payload?.success) {
              const reason = payload?.message || `HTTP ${response.status}`;
              throw new Error(`register-device failed: ${reason}`);
            }

            localStorage.removeItem(pendingTokenKey);
            console.log('FCM token saved to backend');
          } catch (error) {
            localStorage.setItem(pendingTokenKey, tokenValue);
            console.error('Failed to save FCM token:', error);
          }
        };

        // Register listeners before calling register(), or fast devices can emit
        // the registration event before listeners are attached.
        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);
          await registerTokenForCustomer(token.value);
        });

        await PushNotifications.addListener('registrationError', (error) => {
          console.error('Push registration error:', error);
        });

        await PushNotifications.addListener(
          'pushNotificationReceived',
          (notification) => {
            console.log('Push notification received (foreground):', notification);
          }
        );

        await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (action) => {
            console.log('Push notification action performed:', action);

            const data = action.notification.data;
            if (data.type === 'order_update' && data.orderId) {
              window.location.href = `/account/orders/${data.orderId}`;
            } else if (data.type === 'product' && data.productId) {
              window.location.href = `/product/${data.productId}`;
            } else if (data.type === 'promotion') {
              window.location.href = '/products';
            }
          }
        );

        const pendingToken = localStorage.getItem(pendingTokenKey);
        if (pendingToken && customer) {
          await registerTokenForCustomer(pendingToken);
        }

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === 'granted') {
          console.log('Push notification permission granted');
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }
      } catch (error) {
        console.error('Push notification setup error:', error);
      }
    };

    setupPushNotifications();

    return () => {
      mounted = false;
      import('@capacitor/core').then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import('@capacitor/push-notifications').then(({ PushNotifications }) => {
            PushNotifications.removeAllListeners();
          });
        }
      });
    };
  }, [customer, enableNativePush]);

  return null;
}
