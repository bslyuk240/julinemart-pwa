'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/layout/header';
import Footer from '@/components/layout/footer';
import BottomNav from '@/components/layout/BottomNavClient';
import TabBar from '@/components/mobile/shell/tab-bar';
import { getMobileTierRoute } from '@/lib/mobile/mobile-tier-routes';
import { recordNavigation } from '@/lib/mobile/nav-history';

// Campaign landing pages replace the global site header/footer/bottom-nav
// with their own Top Context Navigation Overlay + footer (UI Change Plan,
// Navigation Changes §1: "standard global site navigation is hidden").
// Everything else in the root layout (toasts, PWA prompts, cookie banner,
// support widget) stays global — only nav/chrome is route-conditional here.
//
// Mobile-tier routes (src/lib/mobile/mobile-tier-routes.ts) keep the site
// header/footer at md+ and swap to the mobile shell below md: the page draws
// its own MobileTopBar, and the Material navigation bar replaces BottomNav.
export default function ConditionalChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCampaignRoute = pathname?.startsWith('/campaigns/');
  const mobileTierRoute = getMobileTierRoute(pathname);

  useEffect(() => {
    if (pathname) recordNavigation(pathname);
  }, [pathname]);

  if (isCampaignRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (mobileTierRoute) {
    return (
      <>
        <div className="hidden md:block">
          <Header />
        </div>
        <main
          className={
            mobileTierRoute.tabBar
              ? 'pb-[calc(var(--m-tabbar-h)+var(--jm-vv-bottom-inset,0px))] md:pb-0'
              : undefined
          }
        >
          {children}
        </main>
        <div className="hidden md:block">
          <Footer />
        </div>
        {mobileTierRoute.tabBar && <TabBar />}
      </>
    );
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
