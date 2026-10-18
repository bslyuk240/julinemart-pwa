import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MobileShellDemo from './demo';

export const metadata: Metadata = {
  title: 'Mobile shell demo',
  robots: { index: false, follow: false },
};

// Dev-only playground for the mobile tier primitives (plan milestone M0).
export default function MobileShellDemoPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <MobileShellDemo />;
}
