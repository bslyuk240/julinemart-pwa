'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useCampaignTelemetry, type CampaignQrVariantRef } from '@/hooks/useCampaignTelemetry';
import { savePendingCampaignVoucher } from '@/components/campaigns/OfferSection';

const LOCATION_OPTIONS = ['Warri', 'Asaba', 'Benin', 'Lagos', 'Abuja', 'Other'];

type Phase = 'pending' | 'locked' | 'unlocked' | 'success' | 'duplicate' | 'closed';

interface RewardInfo {
  code: string;
  discountType?: string;
  discountValue?: number;
  description?: string;
}

function useCountdown(target?: string) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);

  return useMemo(() => {
    if (!target || now == null) return null;
    const totalMs = new Date(target).getTime() - now;
    if (totalMs <= 0) return null;
    const totalSeconds = Math.floor(totalMs / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
    };
  }, [target, now]);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export default function GiveawayEntrySection({
  campaignId,
  slug,
  publicTitle,
  startDate,
  endDate,
  grandPrizeDescription,
  qrVariants = [],
}: {
  campaignId: string;
  slug: string;
  publicTitle: string;
  startDate?: string;
  endDate?: string;
  grandPrizeDescription?: string;
  qrVariants?: CampaignQrVariantRef[];
}) {
  const { track } = useCampaignTelemetry(campaignId, qrVariants);
  const countdownToStart = useCountdown(startDate);
  const hasEnded = Boolean(endDate && new Date(endDate).getTime() < Date.now());
  const notStartedYet = Boolean(startDate && new Date(startDate).getTime() > Date.now());

  const [phase, setPhase] = useState<Phase>(hasEnded ? 'closed' : notStartedYet ? 'pending' : 'locked');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const [fullName, setFullName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [otherLocation, setOtherLocation] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [entryPosition, setEntryPosition] = useState<number | null>(null);
  const [reward, setReward] = useState<RewardInfo | null>(null);

  useEffect(() => {
    if (hasEnded) setPhase('closed');
    else if (!notStartedYet && phase === 'pending') setPhase('locked');
  }, [hasEnded, notStartedYet, phase]);

  const source = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    return new URLSearchParams(window.location.search).get('qr_source') ?? undefined;
  }, []);

  async function handleUnlock() {
    if (!code.trim()) {
      setCodeError('Enter the secret code');
      return;
    }
    setCheckingCode(true);
    setCodeError(null);
    try {
      const res = await fetch('/api/giveaways/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, slug, code: code.trim() }),
      });
      const data = await res.json();
      if (data?.data?.valid) {
        track('cta_click', { cta: 'giveaway_code_unlocked' });
        setPhase('unlocked');
      } else if (data?.data?.campaignState === 'ended') {
        setPhase('closed');
      } else {
        setCodeError("That's not the correct Secret Drop code.");
      }
    } catch {
      setCodeError('Could not check the code right now — try again.');
    } finally {
      setCheckingCode(false);
    }
  }

  async function handleSubmit() {
    setFormError(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Enter your full name');
      return;
    }
    if (!/^(\+234|0)[789]\d{9}$/.test(whatsappNumber.trim())) {
      setFormError('Enter a valid Nigerian WhatsApp number');
      return;
    }
    if (!acceptedTerms) {
      setFormError('You must accept the giveaway terms');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/giveaways/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          slug,
          code: code.trim(),
          fullName: fullName.trim(),
          whatsappNumber: whatsappNumber.trim(),
          email: email.trim() || undefined,
          location: location === 'Other' ? otherLocation.trim() : location || undefined,
          marketingOptIn,
          source,
        }),
      });
      const data = await res.json();

      if (!res.ok && data?.error === 'entry_limit_reached') {
        setPhase('closed');
        return;
      }
      if (!res.ok && data?.error === 'invalid_code') {
        setPhase('locked');
        setCodeError("That's not the correct Secret Drop code.");
        return;
      }
      if (!data?.success) {
        setFormError(data?.error || 'Could not submit your entry — try again.');
        return;
      }

      track('cta_click', { cta: 'giveaway_entry_submitted' });
      setEntryPosition(data.data.entryPosition ?? null);

      if (data.data.status === 'duplicate') {
        setPhase('duplicate');
        return;
      }

      if (data.data.reward?.code) {
        setReward(data.data.reward);
        savePendingCampaignVoucher(data.data.reward.code);
      }
      setPhase('success');
    } catch {
      setFormError('Could not submit your entry — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-6 sm:p-8">
      {phase === 'pending' && (
        <div className="text-center">
          <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-purple-600">
            {publicTitle}
          </p>
          <h2 className="mb-4 text-xl font-extrabold text-gray-900 sm:text-2xl">
            🔐 Secret code required
          </h2>
          {countdownToStart && (
            <div className="mx-auto flex max-w-xs items-center justify-center gap-3 rounded-2xl border border-purple-100 bg-white px-4 py-3">
              {countdownToStart.days > 0 && (
                <span className="font-mono text-lg font-extrabold tabular-nums text-gray-900">
                  {countdownToStart.days}d
                </span>
              )}
              <span className="font-mono text-lg font-extrabold tabular-nums text-gray-900">
                {pad(countdownToStart.hours)}:{pad(countdownToStart.minutes)}:{pad(countdownToStart.seconds)}
              </span>
            </div>
          )}
          <p className="mt-3 text-xs text-gray-500">The code isn&apos;t usable until this opens.</p>
        </div>
      )}

      {phase === 'locked' && (
        <div className="mx-auto max-w-sm text-center">
          <h2 className="mb-1 text-xl font-extrabold text-gray-900 sm:text-2xl">Enter Secret Code</h2>
          <p className="mb-4 text-sm text-gray-500">Watch our WhatsApp Channel for the drop.</p>
          <input
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setCodeError(null);
            }}
            placeholder="SECRET CODE"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center font-mono text-lg font-extrabold uppercase tracking-widest"
          />
          {codeError && <p className="mt-2 text-sm font-medium text-red-600">{codeError}</p>}
          <button
            type="button"
            onClick={handleUnlock}
            disabled={checkingCode}
            className="mt-4 min-h-[48px] w-full rounded-full bg-purple-600 px-6 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {checkingCode ? 'Checking…' : 'Continue'}
          </button>
        </div>
      )}

      {phase === 'unlocked' && (
        <div className="mx-auto max-w-sm">
          <h2 className="mb-1 text-center text-xl font-extrabold text-gray-900">🎉 Code unlocked!</h2>
          <p className="mb-4 text-center text-sm text-gray-500">Complete your entry below.</p>
          <div className="space-y-3">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />
            <input
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="WhatsApp number (08012345678)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700"
            >
              <option value="">Location (optional)</option>
              {LOCATION_OPTIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            {location === 'Other' && (
              <input
                value={otherLocation}
                onChange={(e) => setOtherLocation(e.target.value)}
                placeholder="Your city"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
            />

            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5"
              />
              I accept the giveaway terms
            </label>
            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="mt-0.5"
              />
              Send me JulineMart deals and Secret Drop alerts on WhatsApp
            </label>

            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[48px] w-full rounded-full bg-purple-600 px-6 text-sm font-extrabold text-white disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Enter Giveaway'}
            </button>
          </div>
        </div>
      )}

      {phase === 'success' && (
        <div className="mx-auto max-w-sm text-center">
          <h2 className="mb-1 text-xl font-extrabold text-gray-900">🎉 You&apos;re in!</h2>
          {entryPosition != null && (
            <p className="mb-3 text-sm text-gray-600">You&apos;re entrant #{entryPosition}.</p>
          )}
          {reward ? (
            <div className="mt-4 rounded-2xl border border-purple-200 bg-white p-4">
              <p className="mb-2 text-sm font-semibold text-purple-700">
                🎁 You unlocked a JulineMart reward!
              </p>
              <p className="mb-3 font-mono text-lg font-extrabold tracking-widest text-gray-900">
                {reward.code}
              </p>
              {reward.description && <p className="mb-3 text-xs text-gray-500">{reward.description}</p>}
              <a
                href="/"
                onClick={() => toast.success(`${reward.code} saved — it prefills at checkout`)}
                className="block min-h-[44px] w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-extrabold leading-6 text-white"
              >
                Shop Now
              </a>
            </div>
          ) : (
            <a
              href="/"
              className="mt-4 block min-h-[44px] w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-extrabold leading-6 text-white"
            >
              Explore JulineMart
            </a>
          )}
        </div>
      )}

      {phase === 'duplicate' && (
        <div className="mx-auto max-w-sm text-center">
          <h2 className="mb-2 text-lg font-extrabold text-gray-900">You&apos;ve already entered</h2>
          <p className="text-sm text-gray-500">
            {entryPosition != null ? `You're entrant #${entryPosition}. ` : ''}
            Only one entry per WhatsApp number counts toward the draw.
          </p>
        </div>
      )}

      {phase === 'closed' && (
        <div className="mx-auto max-w-sm text-center">
          <h2 className="mb-2 text-lg font-extrabold text-gray-900">🎉 Entries are now closed.</h2>
          <p className="mb-4 text-sm text-gray-500">
            Winner announcement coming soon.{grandPrizeDescription ? ` Prize: ${grandPrizeDescription}.` : ''} In the meantime, explore JulineMart.
          </p>
          <a
            href="/"
            className="block min-h-[44px] w-full rounded-full bg-purple-600 px-6 py-3 text-sm font-extrabold leading-6 text-white"
          >
            Shop JulineMart
          </a>
        </div>
      )}
    </section>
  );
}
