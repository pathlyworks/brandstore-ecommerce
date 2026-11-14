/** Badge: a short status label (stock, order status). Information is in the text, never in the colour alone. */
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  /** A placeholder of the same size while the value is unknown. */
  loading?: boolean;
  /** Greyed out: the status no longer applies (e.g. a cancelled order). */
  muted?: boolean;
  className?: string;
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-bg text-text border-border',
  info: 'bg-primary-soft text-primary-deep border-primary-tint',
  success: 'bg-surface text-success border-success',
  warning: 'bg-accent-soft text-accent border-accent',
  danger: 'bg-surface text-danger border-danger',
};

export function Badge({
  tone = 'neutral',
  children,
  loading = false,
  muted = false,
  className,
}: BadgeProps) {
  if (loading) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'inline-block h-6 w-20 animate-pulse rounded-pill bg-disabled-bg motion-reduce:animate-none',
          className,
        )}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-pill border px-xs py-3xs text-xs font-semibold tracking-wide',
        muted ? 'border-disabled-bg bg-disabled-bg text-disabled-text' : TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
