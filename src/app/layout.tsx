import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/header';
import BottomNav from '@/components/layout/bottom-nav';
import { Toaster } from 'sonner';
import { CustomerAuthProvider } from '@/context/customer-auth-context';
import WhatsAppFloat from '@/components/layout/whatsapp-float';
import PWAInstallPrompt from '@/components/pwa/pwa-install-prompt';

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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
      </head>
      <body className={inter.className}>
        <CustomerAuthProvider>
          <Header />
          {children}
          <BottomNav />
          <Toaster position="top-center" richColors />
          <PWAInstallPrompt />
        </CustomerAuthProvider>
        <WhatsAppFloat />
      </body>
    </html>
  );
}