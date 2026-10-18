'use client';

import PageHeader, { type PageHeaderProps } from '@/components/layout/page-header';
import { useMobileTier } from '@/components/mobile/mobile-tier-context';
import MobileTopBar from '@/components/mobile/shell/mobile-top-bar';

type AccountPageHeaderProps = Omit<PageHeaderProps, 'backHref' | 'backLabel'> &
  Partial<Pick<PageHeaderProps, 'backHref' | 'backLabel'>>;

export default function AccountPageHeader({
  backHref = '/account',
  backLabel = 'Back to account',
  ...props
}: AccountPageHeaderProps) {
  // Mobile tier (docs/mobile-tier-plan.md, wave 2): every account sub-page gets a
  // Material top bar below md from this one place; md and up keep the page header.
  const tier = useMobileTier() !== null;
  if (!tier) return <PageHeader backHref={backHref} backLabel={backLabel} {...props} />;

  return (
    <>
      <div className="sticky top-0 z-m-header -mx-4 -mt-5 mb-3 bg-m-surface-low md:hidden">
        <MobileTopBar
          title={props.title}
          subtitle={props.subtitle}
          backHref={backHref}
          actions={props.action ? <div className="flex items-center pr-3">{props.action}</div> : undefined}
        />
      </div>
      <div className="max-md:hidden">
        <PageHeader backHref={backHref} backLabel={backLabel} {...props} />
      </div>
    </>
  );
}
