import PageHeader, { type PageHeaderProps } from '@/components/layout/page-header';

type AccountPageHeaderProps = Omit<PageHeaderProps, 'backHref' | 'backLabel'> &
  Partial<Pick<PageHeaderProps, 'backHref' | 'backLabel'>>;

export default function AccountPageHeader({
  backHref = '/account',
  backLabel = 'Back to account',
  ...props
}: AccountPageHeaderProps) {
  return <PageHeader backHref={backHref} backLabel={backLabel} {...props} />;
}
