import { cn } from '../lib/cn';

export interface SpinnerProps {
  /** Read by screen readers; the spinner itself is decorative. */
  label?: string;
  className?: string;
}

/** A small spinning ring in the current text colour, with a visually hidden label. */
export function Spinner({ label = 'Loading', className }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2xs', className)}>
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-pill border-2 border-current border-t-transparent motion-reduce:animate-none"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
