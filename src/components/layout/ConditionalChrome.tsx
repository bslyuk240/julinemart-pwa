'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BottomNav from '@/components/layout/BottomNavClient';

// Campaign landing pages replace the global site header/footer/bottom-nav
// with their own Top Context Navigation Overlay + footer (UI Change Plan,
// Navigation Changes §1: "standard global site navigation is hidden").
// Everything else in the root layout (toasts, PWA prompts, cookie banner,
// support widget) stays global — only nav/chrome is route-conditional here.
export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCampaignRoute = pathname?.startsWith('/campaigns/');

  if (isCampaignRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="pb-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--jm-vv-bottom-inset,0px))] md:pb-0">
        {children}
      </main>
      <Footer />
      <BottomNav />
    </>
  );
}
