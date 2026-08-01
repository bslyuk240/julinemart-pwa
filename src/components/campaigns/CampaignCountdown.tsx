'use client';

import { useEffect, useState } from 'react';

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
};

function getTimeLeft(endDate: string, now: number): TimeLeft | null {
  const totalMs = new Date(endDate).getTime() - now;
  if (!Number.isFinite(totalMs) || totalMs <= 0) return null;
  const totalSeconds = Math.floor(totalMs / 1000);
  return {
    totalMs,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-[2.75rem] flex-col items-center">
      <span className="font-mono text-base font-extrabold tabular-nums text-gray-900 sm:text-lg">
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
    </div>
  );
}

export default function CampaignCountdown({
  endDate,
  variant = 'banner',
  inline = false,
  className = '',
}: {
  endDate?: string;
  variant?: 'banner' | 'compact' | 'micro';
  inline?: boolean;
  className?: string;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!endDate) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endDate]);

  if (!endDate || now == null) return null;

  const left = getTimeLeft(endDate, now);
  if (!left) {
    if (variant === 'compact') {
      const Tag = inline ? 'span' : 'p';
      return (
        <Tag className={`text-[11px] font-bold text-red-600 ${className}`.trim()}>Ended</Tag>
      );
    }
    if (variant === 'micro') {
      return (
        <span className={`block truncate text-[8px] font-extrabold leading-none text-red-300 ${className}`.trim()}>
          Ended
        </span>
      );
    }
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
        This campaign offer has ended
      </div>
    );
  }

  const urgent = left.totalMs < 24 * 60 * 60 * 1000;

  if (variant === 'micro') {
    const text =
      left.days > 0
        ? `${left.days}d ${left.hours}h`
        : left.hours > 0
          ? `${left.hours}h ${pad(left.minutes)}m`
          : `${left.minutes}:${pad(left.seconds)}`;
    return (
      <span
        className={`block truncate text-[8px] font-extrabold leading-none tabular-nums ${
          urgent ? 'text-secondary-300' : 'text-white'
        } ${className}`.trim()}
      >
        {text}
      </span>
    );
  }

  if (variant === 'compact') {
    const text = left.days > 0
      ? `${left.days}d ${pad(left.hours)}h ${pad(left.minutes)}m left`
      : `${pad(left.hours)}:${pad(left.minutes)}:${pad(left.seconds)} left`;
    const Tag = inline ? 'span' : 'p';
    return (
      <Tag
        className={`text-[11px] font-bold tabular-nums ${urgent ? 'text-secondary-600' : 'text-gray-500'} ${className}`.trim()}
      >
        {text}
      </Tag>
    );
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 sm:px-5 ${
        urgent
          ? 'border-secondary-200 bg-secondary-50'
          : 'border-primary-100 bg-white'
      }`}
    >
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p
          className={`text-xs font-extrabold uppercase tracking-wide ${
            urgent ? 'text-secondary-700' : 'text-primary-600'
          }`}
        >
          {urgent ? 'Ending soon' : 'Offer ends in'}
        </p>
        <div className="flex items-center gap-3 sm:gap-4">
          {left.days > 0 && <Unit value={String(left.days)} label="Days" />}
          {left.days > 0 && <span className="pb-4 text-gray-300">:</span>}
          <Unit value={pad(left.hours)} label="Hrs" />
          <span className="pb-4 text-gray-300">:</span>
          <Unit value={pad(left.minutes)} label="Min" />
          <span className="pb-4 text-gray-300">:</span>
          <Unit value={pad(left.seconds)} label="Sec" />
        </div>
      </div>
    </div>
  );
}
