import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { CustomerAuthProvider } from '@/context/customer-auth-context';
import SupportChatWidget from '@/components/support/SupportChatWidget';
import PWAInstallPrompt from '@/components/pwa/pwa-install-prompt';
import NotificationPermissionPrompt from '@/components/pwa/notification-permission-prompt';
import PWAStandaloneTracker from '@/components/pwa/pwa-standalone-tracker';
import GlobalPullToRefresh from '@/components/layout/global-pull-to-refresh';
import ConditionalChrome from '@/components/layout/ConditionalChrome';
import { StatusBarManager } from '@/components/native/status-bar-manager';
import PushNotificationManager from '@/components/native/push-notification-manager';
import WebPushManager from '@/components/pwa/web-push-manager';
import CookieConsentBanner from '@/components/pwa/cookie-consent-banner';
import GoogleAnalytics from '@/components/pwa/google-analytics';
import VisualViewportBottomSync from '@/components/layout/visual-viewport-bottom-sync';
import PaystackPreloader from '@/components/payments/paystack-preloader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JulineMart - Your One-Stop Marketplace',
  description: 'Shop the best deals on phones, electronics, fashion and more at JulineMart',
  keywords: 'marketplace, e-commerce, online shopping, deals, Nigeria',
  authors: [{ name: 'JulineMart' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'JulineMart',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#77088a',
  viewportFit: 'cover',
  // Chrome/Android: resize layout with browser UI so fixed bottom bars stay aligned with visible viewport.
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-auto overflow-x-clip">
      <head>
        {/* Warm up connections to the image/video origins so the first
            product images and hero video handshake without DNS+TLS delay. */}
        <link rel="preconnect" href="https://gfikkrwhsedhwmkxybzm.supabase.co" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://gfikkrwhsedhwmkxybzm.supabase.co" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />

        {/* Favicon Links (from RealFaviconGenerator) */}
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="JulineMart" />
        
        {/* Android */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#77088a" />

        {/* Google Analytics is consent-gated — see <GoogleAnalytics /> in body.
            Nothing loads from Google until the visitor accepts analytics. */}

      </head>
      <body className={`${inter.className} min-h-0 overflow-x-clip`}>
        <VisualViewportBottomSync />
        <PaystackPreloader />
        <StatusBarManager />
        <PWAStandaloneTracker />
        <CustomerAuthProvider>
          <PushNotificationManager />
          <WebPushManager />
          <GlobalPullToRefresh>
            <ConditionalChrome>{children}</ConditionalChrome>
            <Toaster position="top-center" richColors />
            <PWAInstallPrompt />
            <NotificationPermissionPrompt />
            <CookieConsentBanner />
            <GoogleAnalytics />
          </GlobalPullToRefresh>
          <SupportChatWidget />
        </CustomerAuthProvider>
      </body>
    </html>
  );
}
