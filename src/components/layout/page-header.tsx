import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  action?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Go back',
  showBack = true,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4 md:mb-6">
      {showBack ? (
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex-shrink-0 w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="text-base md:text-xl font-bold text-gray-900 leading-tight">{title}</h1>
        {subtitle ? (
          <p className="text-xs md:text-sm text-gray-600 mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
