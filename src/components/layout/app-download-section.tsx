'use client';

import Link from 'next/link';
import { Share } from 'lucide-react';
import Lottie from 'lottie-react';
import googlePlayAnimation from '@/data/google-play-button.json';

// Reuses the exact Play Store badge/link already used in the global footer
// (src/components/layout/footer.tsx) and the exact 3-step Safari copy already
// used in the PWA install modal (src/components/pwa/pwa-install-prompt.tsx)
// — same content, just as a static inline section rather than a popup, for
// pages (campaign/gift landing pages) that want it visible without waiting
// on the modal's visit-count/delay logic.
export default function AppDownloadSection() {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">Get the JulineMart App</h2>
          <p className="mt-1 text-sm text-gray-500">
            Faster shopping, order tracking, and exclusive deals — right from your home screen.
          </p>
          <Link
            href="https://play.google.com/store/apps/details?id=com.julinemart.app"
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-[140px]"
            aria-label="Download on Google Play"
          >
            <Lottie animationData={googlePlayAnimation} loop initialSegment={[0, 155]} />
          </Link>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="mb-3 text-sm font-semibold text-blue-900">
            📱 iPhone/iPad: Add to your home screen
          </p>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-bold">1.</span>
              <span>
                Tap the <Share className="mx-1 inline h-4 w-4" /> Share button at the bottom of Safari
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">2.</span>
              <span>
                Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">3.</span>
              <span>
                Tap <strong>&quot;Add&quot;</strong> in the top right corner
              </span>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
