import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/header';
import BottomNav from '@/components/layout/bottom-nav';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JulineMart - Your One-Stop Marketplace',
  description: 'Shop the best deals on phones, electronics, fashion and more at JulineMart',
  keywords: 'marketplace, e-commerce, online shopping, deals, Nigeria',
  authors: [{ name: 'JulineMart' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  themeColor: '#7c3aed',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        {children}
        <BottomNav />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}