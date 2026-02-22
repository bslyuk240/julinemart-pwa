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

let firebaseApp: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;
let warnedMissingConfig = false;

function getFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !messagingSenderId || !appId) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        'Web push disabled: missing NEXT_PUBLIC_FIREBASE_* web SDK environment variables.'
      );
    }
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    messagingSenderId,
    appId,
  };
}

export function getFirebaseWebApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;

  if (firebaseApp) return firebaseApp;

  const config = getFirebaseWebConfig();
  if (!config) return null;

  firebaseApp = getApps().length ? getApp() : initializeApp(config);
  return firebaseApp;
}

export async function getFirebaseWebMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null;

  if (!messagingPromise) {
    messagingPromise = (async () => {
      const app = getFirebaseWebApp();
      if (!app) return null;

      const supported = await isSupported().catch(() => false);
      if (!supported) return null;

      return getMessaging(app);
    })();
  }

  return messagingPromise;
}
