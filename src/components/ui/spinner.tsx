import { clsx } from 'clsx';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, { box: number; stroke: number }> = {
  sm: { box: 16, stroke: 2 }, // inside buttons and inline text
  md: { box: 24, stroke: 2.5 }, // sections, "loading more"
  lg: { box: 32, stroke: 3 }, // whole-page loading
};

interface SpinnerProps {
  size?: SpinnerSize;
  /** `primary` (brand purple) for standalone loaders, `m-primary` on mobile-tier screens; `current` inherits the text colour, e.g. inside a button. */
  tone?: 'primary' | 'm-primary' | 'current';
  /** Announced to screen readers. Omit when the surrounding text already says what is loading. */
  label?: string;
  className?: string;
}

/**
 * The app's one loading indicator: a Material-style circular arc. Use skeletons instead when the
 * layout of the incoming content is known (listings, cards).
 */
export default function Spinner({ size = 'md', tone = 'primary', label, className }: SpinnerProps) {
  const { box, stroke } = SIZES[size];
  const radius = (box - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx('inline-block shrink-0', tone === 'primary' ? 'text-primary-600' : tone === 'm-primary' ? 'text-m-primary' : 'text-current', className)}
      style={{ width: box, height: box }}
    >
      <svg
        viewBox={`0 0 ${box} ${box}`}
        width={box}
        height={box}
        className="animate-spin motion-reduce:[animation-duration:1.6s]"
        fill="none"
      >
        <circle cx={box / 2} cy={box / 2} r={radius} stroke="currentColor" strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.3} ${circumference}`}
        />
      </svg>
    </span>
  );
}
