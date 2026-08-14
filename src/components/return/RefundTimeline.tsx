'use client';

import { formatPrice } from '@/lib/utils/format-price';
import type { JloRefundInfo } from '@/lib/jlo/returns';

type RefundTimelineProps = {
  refund: JloRefundInfo & {
    refund_initiated_at?: string | null;
    refund_expected_by?: string | null;
    refund_method?: string | null;
  };
  className?: string;
};

type Step = {
  key: string;
  label: string;
  done: boolean;
  active: boolean;
};

function formatShortDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  } catch {
    return null;
  }
}

function buildSteps(status: JloRefundInfo['refund_status'], requestStatus?: string): Step[] {
  const normalized = (requestStatus || '').toLowerCase();
  const refundStatus = status || 'none';

  const approved =
    ['approved', 'refund_processing', 'refund_completed', 'completed'].includes(normalized) ||
    ['pending', 'completed'].includes(refundStatus);

  const sent =
    ['refund_processing', 'refund_completed', 'completed'].includes(normalized) ||
    refundStatus === 'pending';

  const completed = refundStatus === 'completed' || normalized === 'refund_completed';

  return [
    { key: 'approved', label: 'Refund approved', done: approved, active: approved && !sent },
    { key: 'sent', label: 'Sent to payment provider', done: sent, active: sent && !completed },
    { key: 'completed', label: 'Completed', done: completed, active: completed },
  ];
}

export default function RefundTimeline({ refund, className = '' }: RefundTimelineProps) {
  const status = refund.refund_status;
  if (!status || status === 'none') return null;

  const steps = buildSteps(status);
  const initiated = formatShortDate(refund.refund_initiated_at);
  const expected = formatShortDate(refund.refund_expected_by);
  const amount =
    refund.refund_amount != null
      ? formatPrice(refund.refund_amount, refund.refund_currency || 'NGN')
      : null;

  return (
    <div className={`rounded-2xl border border-sky-100 bg-sky-50/60 p-4 ${className}`}>
      <div className="mb-3">
        <p className="text-sm font-semibold text-gray-900">
          {status === 'completed' ? 'Refund completed' : 'Refund in progress'}
        </p>
        {amount && <p className="text-lg font-bold text-gray-900 mt-0.5">{amount}</p>}
        <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
          {refund.refund_method && <p>Method: {refund.refund_method}</p>}
          {initiated && <p>Initiated: {initiated}</p>}
          {expected && status !== 'completed' && (
            <p>Expected: {initiated ? `${initiated} – ${expected}` : expected}</p>
          )}
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                step.done ? 'bg-emerald-500' : 'bg-gray-300'
              } ${step.active ? 'ring-2 ring-emerald-200' : ''}`}
              aria-hidden
            />
            <span className={`text-xs ${step.done ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {status === 'failed' && (
        <p className="mt-3 text-xs text-red-700 font-medium">
          Refund failed — contact JulineMart support with your order number.
        </p>
      )}
    </div>
  );
}
