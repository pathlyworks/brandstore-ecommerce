/**
 * Steps: a progress indicator for a multi-step flow. An ordered list in a labelled <nav>; the current step
 * has aria-current="step"; each step says its number and state in text ("Step 2 of 3, completed"), so
 * nothing relies on colour. A step the shopper may open is a link; a locked one is plain text.
 */
import { Link } from 'react-router';
import { cn } from '../lib/cn';

export type StepState = 'complete' | 'current' | 'upcoming' | 'error';

export interface StepItem<T extends string> {
  id: T;
  label: string;
  /** Where the step lives; omitted or `locked` → not a link. */
  to?: string;
  state: StepState;
  locked?: boolean;
}

export interface StepsProps<T extends string> {
  label: string;
  steps: readonly StepItem<T>[];
  /** Placeholder bars while the flow's data loads. */
  loading?: boolean;
}

const STATE_TEXT: Record<StepState, string> = {
  complete: 'completed',
  current: 'current step',
  upcoming: 'not started',
  error: 'needs attention',
};

const MARK: Record<StepState, string> = {
  complete: 'border-success bg-success text-white',
  current: 'border-primary bg-primary text-white',
  upcoming: 'border-border-control bg-surface text-text-muted',
  error: 'border-danger bg-surface text-danger',
};

export function Steps<T extends string>({ label, steps, loading = false }: StepsProps<T>) {
  return (
    <nav aria-label={label} aria-busy={loading || undefined}>
      <ol className="flex flex-col gap-xs md:flex-row md:gap-md">
        {steps.map((step, index) => {
          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-(--size-tap-target) shrink-0 items-center justify-center rounded-pill border-(length:--border-medium) font-bold',
                  loading
                    ? 'animate-pulse border-border bg-disabled-bg text-transparent'
                    : MARK[step.state],
                )}
              >
                {step.state === 'complete' ? '✓' : step.state === 'error' ? '!' : index + 1}
              </span>
              <span className="flex flex-col">
                <span className="font-semibold">{step.label}</span>
                <span className="text-sm text-text-muted">
                  Step {index + 1} of {steps.length}, {loading ? 'loading' : STATE_TEXT[step.state]}
                </span>
              </span>
            </>
          );
          const linkable = step.to && !step.locked && !loading;
          return (
            <li key={step.id} className="flex-1">
              {linkable ? (
                <Link
                  to={step.to ?? ''}
                  aria-current={step.state === 'current' ? 'step' : undefined}
                  className="flex min-h-(--size-tap-target) items-center gap-xs rounded-md p-2xs text-text hover:bg-primary-soft focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary"
                >
                  {content}
                </Link>
              ) : (
                <span
                  aria-current={step.state === 'current' ? 'step' : undefined}
                  aria-disabled={step.locked || undefined}
                  className={cn(
                    'flex min-h-(--size-tap-target) items-center gap-xs p-2xs',
                    step.locked ? 'text-disabled-text' : 'text-text',
                  )}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
