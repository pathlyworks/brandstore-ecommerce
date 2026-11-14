/**
 * Input: a labelled text field. Controlled by the caller (value + onChange); `error` marks it invalid and is
 * read out with it; `loading` shows a spinner inside the field (e.g. while a search runs).
 */
import { useId, type ComponentPropsWithRef } from 'react';
import { cn } from '../lib/cn';
import { controlClass, describedBy, Field } from './Field';
import { Spinner } from './Spinner';

export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  loading?: boolean;
  id?: string;
}

export function Input({
  label,
  hint,
  error,
  hideLabel,
  loading = false,
  id,
  className,
  ...rest
}: InputProps) {
  const auto = useId();
  const base = id ?? auto;
  const ids = { control: base, hint: `${base}-hint`, error: `${base}-error` };
  return (
    <Field
      ids={ids}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <div className="relative">
        <input
          id={ids.control}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(ids, hint, error)}
          aria-busy={loading || undefined}
          className={cn(controlClass, loading && 'pr-xl')}
          {...rest}
        />
        {loading && (
          <Spinner
            label="Searching"
            className="absolute top-1/2 right-sm -translate-y-1/2 text-primary"
          />
        )}
      </div>
    </Field>
  );
}
