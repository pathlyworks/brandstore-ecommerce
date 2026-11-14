/**
 * Select<T>: a labelled native <select> whose value type is the union of its option values. The options are
 * typed once (`as const` or a typed array) and `onChange` receives a T, never a raw string, so a sort or a
 * category cannot be set to something the API does not accept.
 */
import { useId, type ChangeEvent } from 'react';
import { cn } from '../lib/cn';
import { controlClass, describedBy, Field } from './Field';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
  loading?: boolean;
  hideLabel?: boolean;
  name?: string;
  id?: string;
  className?: string;
}

export function Select<T extends string>({
  label,
  options,
  value,
  onChange,
  hint,
  error,
  disabled = false,
  loading = false,
  hideLabel,
  name,
  id,
  className,
}: SelectProps<T>) {
  const auto = useId();
  const base = id ?? auto;
  const ids = { control: base, hint: `${base}-hint`, error: `${base}-error` };
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const chosen = options.find((option) => option.value === event.target.value);
    if (chosen) onChange(chosen.value);
  }
  return (
    <Field
      ids={ids}
      label={label}
      hint={hint}
      error={error}
      hideLabel={hideLabel}
      className={className}
    >
      <select
        id={ids.control}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled || loading}
        aria-invalid={error ? true : undefined}
        aria-busy={loading || undefined}
        aria-describedby={describedBy(ids, hint, error)}
        className={cn(controlClass, 'appearance-auto', loading && 'animate-pulse')}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
