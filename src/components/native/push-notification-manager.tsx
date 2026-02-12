// src/components/native/push-notification-manager.tsx
'use client';

import { useEffect } from 'react';
import { useCustomerAuth } from '@/context/customer-auth-context';

export default function PushNotificationManager() {
  const { customer } = useCustomerAuth();
  const enableNativePush = process.env.NEXT_PUBLIC_ENABLE_NATIVE_PUSH === 'true';

  useEffect(() => {
    let mounted = true;

    const setupPushNotifications = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) {
          console.log('Push notifications: Web platform detected, skipping setup');
          return;
        }

        if (!enableNativePush) {
          console.log(
            'Push notifications: disabled (NEXT_PUBLIC_ENABLE_NATIVE_PUSH is not true)'
          );
          return;
        }

        const { PushNotifications } = await import('@capacitor/push-notifications');
        console.log('Initializing push notifications...');

        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive === 'granted') {
          console.log('Push notification permission granted');
          await PushNotifications.register();
        } else {
          console.log('Push notification permission denied');
        }

        await PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token:', token.value);

          if (customer && mounted) {
            try {
              await fetch('/api/notifications/register-device', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customerId: customer.id,
                  fcmToken: token.value,
                  platform: 'android',
                }),
              });
              console.log('FCM token saved to backend');
            } catch (error) {
              console.error('Failed to save FCM token:', error);
            }
          }
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
