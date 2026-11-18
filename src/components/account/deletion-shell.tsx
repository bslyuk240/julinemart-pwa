'use client';

import Link from 'next/link';
import Image from 'next/image';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';

/** Page frame shared by the account-deletion screens (desktop card, phone full screen). */
export default function DeletionShell({ title, backHref, children }: { title: string; backHref: string; children: ReactNode }) {
  const tier = useMobileTier() !== null;
  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || '/images/logo.png';

  return (
    <main
      className={clsx(
        'min-h-screen bg-gray-50 px-4 py-12',
        tier && 'max-md:block max-md:min-h-0 max-md:bg-m-surface max-md:px-0 max-md:pb-10 max-md:pt-0',
      )}
    >
      {tier && <MobileTopBar title="" backHref={backHref} />}
      <div className={clsx('mx-auto w-full max-w-xl space-y-6', tier && 'max-md:px-6')}>
        <div className={clsx('text-center', tier && 'max-md:text-left')}>
          <Link href="/" className="inline-block">
            <Image src={logoSrc} alt="JulineMart" width={52} height={52} className={clsx('mx-auto', tier && 'max-md:mx-0 max-md:mt-2')} />
          </Link>
          <h1 className={clsx('mt-5 text-3xl font-bold text-gray-900', tier && 'max-md:text-[28px] max-md:font-semibold max-md:leading-9 max-md:text-m-on-surface')}>
            {title}
          </h1>
        </div>
        <div className={clsx('rounded-lg bg-white p-6 shadow-md md:p-8', tier && 'max-md:bg-transparent max-md:p-0 max-md:shadow-none')}>
          {children}
        </div>
      </div>
    </main>
  );
}
