/**
 * The label, hint and error around a form control, shared by Input and Select so every field is labelled,
 * describes its hint and error (aria-describedby) and marks itself invalid the same way.
 */
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FieldIds {
  control: string;
  hint: string;
  error: string;
}

export interface FieldProps {
  ids: FieldIds;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  hideLabel?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function Field({
  ids,
  label,
  hint,
  error,
  hideLabel = false,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-2xs', className)}>
      <label
        htmlFor={ids.control}
        className={cn('text-sm font-semibold text-text', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      {children}
      {hint && (
        <p id={ids.hint} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={ids.error} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby for a control: the hint and the error, when present. */
export function describedBy(ids: FieldIds, hint?: string, error?: string): string | undefined {
  const list = [hint && ids.hint, error && ids.error].filter(Boolean).join(' ');
  return list || undefined;
}

export const controlClass = cn(
  'min-h-(--size-tap-target) w-full rounded-md border-2 border-border-control bg-surface px-sm text-md text-text',
  'hover:border-primary',
  'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-primary focus-visible:outline-solid',
  'disabled:cursor-not-allowed disabled:border-disabled-bg disabled:bg-disabled-bg disabled:text-disabled-text',
  'aria-invalid:border-danger',
);
