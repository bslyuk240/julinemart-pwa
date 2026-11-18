'use client';

import { useState } from 'react';
import RewardsView, { type Wallet } from '@/components/rewards/rewards-view';

// Sample data only; nothing here talks to a server.
const ENABLED: Wallet = {
  enabled: true,
  programme: {
    name: 'JulinePoints',
    points_to_ngn: 5,
    daily_claim: { enabled: true, points: 5 },
    streak: { enabled: true, length_days: 7, bonus_points: 5 },
    redemption: { enabled: true, cap_percent: 10, min_points: 1 },
    expiry: { enabled: false, days: 365 },
  },
  wallet: { available_points: 120, available_ngn: 600, pending_points: 15, pending_ngn: 75 },
  daily: { enabled: true, claimed_today: false, streak: 3 },
  referral: {
    enabled: true,
    code: 'AB12CD34',
    tiers: [
      { min_ngn: 1000, max_ngn: 21000, points: 20 },
      { min_ngn: 21000, max_ngn: 51000, points: 40 },
      { min_ngn: 51000, max_ngn: null, points: 100 },
    ],
    referrals: [
      { label: 'Friend 1', status: 'available', points: 20, note: null },
      { label: 'Friend 2', status: 'pending', points: 0, note: null },
      { label: 'Friend 3', status: 'void', points: 0, note: 'The first order was cancelled or refunded.' },
    ],
    confirmed_count: 1,
    pending_count: 1,
    my_referral_attempt: null,
  },
  history: [
    { id: '1', entry_type: 'daily_claim', points: 5, created_at: '2026-11-17T08:00:00Z' },
    { id: '2', entry_type: 'redemption', points: -100, created_at: '2026-11-12T08:00:00Z' },
    { id: '3', entry_type: 'referral_reward', points: 20, created_at: '2026-11-10T08:00:00Z' },
  ],
};

const VARIANTS: Record<string, Wallet> = {
  enabled: ENABLED,
  claimed: { ...ENABLED, daily: { enabled: true, claimed_today: true, streak: 4 } },
  empty: {
    ...ENABLED,
    wallet: { available_points: 0, available_ngn: 0, pending_points: 0, pending_ngn: 0 },
    daily: { enabled: true, claimed_today: false, streak: 0 },
    referral: { ...ENABLED.referral!, referrals: [] },
    history: [],
  },
  disabled: { enabled: false },
};

export default function RewardsPreview() {
  const [variant, setVariant] = useState<keyof typeof VARIANTS>('enabled');
  const [copied, setCopied] = useState(false);
  return (
    <>
      <div className="fixed right-2 top-2 z-[200] flex gap-1 rounded-lg bg-white/90 p-1 text-xs shadow">
        {Object.keys(VARIANTS).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVariant(v)}
            className={`rounded px-2 py-1 ${variant === v ? 'bg-gray-900 text-white' : 'text-gray-700'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <RewardsView
        state={VARIANTS[variant]}
        claiming={false}
        copied={copied}
        onClaim={() => undefined}
        onShare={() => undefined}
        onCopy={() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      />
    </>
  );
}
