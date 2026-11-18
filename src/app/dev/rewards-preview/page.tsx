import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RewardsPreview from './preview';

export const metadata: Metadata = {
  title: 'Rewards preview',
  robots: { index: false, follow: false },
};

// Dev-only: renders the rewards screen with sample data, so the phone and
// desktop layouts can be checked without the programme being switched on.
// Returns 404 in production builds, like the other /dev routes.
export default function RewardsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <RewardsPreview />;
}
