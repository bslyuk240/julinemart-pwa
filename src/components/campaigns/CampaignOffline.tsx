'use client';

import { Button } from '@/components/ui/button';

// SEC-403 — offline/error fallback. Covers both states named in the UI
// Change Plan: `inactive` (campaign paused/expired — Empty State) and
// `error` (network/fetch failure — Error State), since both are just a
// centered message + single action.
interface CampaignOfflineProps {
  variant?: 'inactive' | 'error';
  onRetry?: () => void;
}

const COPY = {
  inactive: {
    title: 'Campaign Offline',
    body: 'This campaign is currently inactive or has concluded.',
    actionLabel: 'Return to Marketplace Homepage',
  },
  error: {
    title: 'Unable to Load Campaign',
    body: 'Unable to sync campaign. Please check your network connection and reload to view exclusive offers.',
    actionLabel: 'Reload',
  },
} as const;

export default function CampaignOffline({ variant = 'error', onRetry }: CampaignOfflineProps) {
  const copy = COPY[variant];

  function handleAction() {
    if (variant === 'error') {
      if (onRetry) onRetry();
      else window.location.reload();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-gray-900">{copy.title}</h1>
      <p className="max-w-sm text-sm text-gray-600">{copy.body}</p>
      <Button onClick={handleAction} variant="primary">
        {copy.actionLabel}
      </Button>
    </div>
  );
}
