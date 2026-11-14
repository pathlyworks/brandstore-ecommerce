/**
 * Pieces every checkout step shares: the error summary (focused when "Continue" finds errors, each message a
 * link to its field), the guard that sends a skipped-ahead URL back to the first incomplete step, and the
 * hook that runs a step's "Continue".
 */
import { useEffect, useRef, useState, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useCheckout } from './CheckoutContext';
import { blockingStep, stepErrors, STEP_LABELS, type CheckoutStep } from './checkout.model';

export const fieldId = (step: CheckoutStep, field: string) => `checkout-${step}-${field}`;

export function ErrorSummary({
  step,
  errors,
  summaryRef,
}: {
  step: CheckoutStep;
  errors: Record<string, string>;
  summaryRef: RefObject<HTMLDivElement | null>;
}) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div
      ref={summaryRef}
      tabIndex={-1}
      role="alert"
      aria-labelledby={`${step}-errors-title`}
      className="rounded-md border-2 border-danger bg-surface p-md"
    >
      <h3 id={`${step}-errors-title`} className="font-bold text-danger">
        {entries.length === 1
          ? 'Fix 1 problem to continue'
          : `Fix ${entries.length} problems to continue`}
      </h3>
      <ul className="mt-2xs list-disc pl-md">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#${fieldId(step, field)}`} className="text-danger underline">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Before rendering a step: if an earlier step is incomplete, go there instead (no skipping by URL). */
export function StepGuard({ step, children }: { step: CheckoutStep; children: ReactNode }) {
  const { draft } = useCheckout();
  const blocker = blockingStep(draft, step);
  if (blocker) {
    return (
      <Navigate
        to={`/checkout/${blocker}`}
        replace
        state={{ notice: `Complete "${STEP_LABELS[blocker]}" first.` }}
      />
    );
  }
  return children;
}

/**
 * "Continue": mark the step touched (its errors now show as the shopper types); with errors, show and focus
 * the summary and stay; without, go to the next step (a new history entry, so Back returns here).
 */
export function useStepSubmit(step: CheckoutStep, next: string) {
  const { draft, dispatch } = useCheckout();
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const errors = stepErrors(draft, step);
  const showErrors = draft.touched.includes(step);

  useEffect(() => {
    if (failedAttempts > 0) summaryRef.current?.focus();
  }, [failedAttempts]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    dispatch({ type: 'touch', step });
    if (Object.keys(errors).length > 0) {
      setFailedAttempts((n) => n + 1);
      return;
    }
    void navigate(next);
  }

  return {
    errors: showErrors ? errors : {},
    summaryErrors: failedAttempts > 0 ? errors : {},
    summaryRef,
    onSubmit,
  };
}
