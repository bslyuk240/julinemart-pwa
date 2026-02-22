'use client';

import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Messaging, getMessaging, isSupported } from 'firebase/messaging';

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

export type FirebaseWebRuntimeConfig = FirebaseWebConfig & {
  vapidKey: string;
};

let firebaseApp: FirebaseApp | null = null;
let configPromise: Promise<FirebaseWebRuntimeConfig | null> | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;
let warnedMissingConfig = false;

export async function getFirebaseWebRuntimeConfig(): Promise<FirebaseWebRuntimeConfig | null> {
  if (typeof window === 'undefined') return null;

  if (!configPromise) {
    configPromise = (async () => {
      try {
        const response = await fetch('/api/notifications/firebase-config', {
          method: 'GET',
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.success || !payload?.config || !payload?.vapidKey) {
          if (!warnedMissingConfig) {
            warnedMissingConfig = true;
            console.warn(
              payload?.message ||
                'Web push disabled: Firebase runtime config endpoint is unavailable.'
            );
          }
          return null;
        }

        return {
          ...(payload.config as FirebaseWebConfig),
          vapidKey: String(payload.vapidKey),
        } satisfies FirebaseWebRuntimeConfig;
      } catch {
        if (!warnedMissingConfig) {
          warnedMissingConfig = true;
          console.warn('Web push disabled: failed to load Firebase runtime config.');
        }
        return null;
      }
    })();
  }

  return configPromise;
}

export async function getFirebaseWebApp(): Promise<FirebaseApp | null> {
  if (typeof window === 'undefined') return null;

  if (firebaseApp) return firebaseApp;

  const runtimeConfig = await getFirebaseWebRuntimeConfig();
  if (!runtimeConfig) return null;

  const config: FirebaseWebConfig = {
    apiKey: runtimeConfig.apiKey,
    authDomain: runtimeConfig.authDomain,
    projectId: runtimeConfig.projectId,
    messagingSenderId: runtimeConfig.messagingSenderId,
    appId: runtimeConfig.appId,
  };

  firebaseApp = getApps().length ? getApp() : initializeApp(config);
  return firebaseApp;
}

export async function getFirebaseWebMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  if (!messagingPromise) {
    messagingPromise = (async () => {
      const app = await getFirebaseWebApp();
      if (!app) return null;

      const supported = await isSupported().catch(() => false);
      if (!supported) return null;

      return getMessaging(app);
    })();
  }

  return messagingPromise;
}
