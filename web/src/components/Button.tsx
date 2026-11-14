/**
 * Button: the one button style of the app. Variants come from the brand tokens; `loading` keeps the button
 * focusable and announced (aria-busy, aria-disabled) and ignores clicks, so a double click cannot submit twice.
 */
import type { ComponentPropsWithRef, MouseEvent, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and ignores clicks, but stays focusable. */
  loading?: boolean;
  /** Text read while loading (default "Loading"). */
  loadingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white border-primary hover:bg-primary-hover hover:border-primary-hover active:bg-primary-active',
  secondary: 'bg-surface text-primary border-primary hover:bg-primary-soft active:bg-primary-tint',
  ghost:
    'bg-transparent text-text border-transparent hover:bg-primary-soft hover:text-primary-hover',
  danger: 'bg-danger text-white border-danger hover:bg-dark hover:border-dark',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-sm text-sm',
  md: 'min-h-(--size-tap-target) px-md text-md',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingLabel = 'Loading',
  icon,
  fullWidth = false,
  disabled,
  className,
  children,
  onClick,
  type = 'button',
  ...rest
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-xs rounded-md border-2 font-semibold transition-colors duration-200',
        'focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-offset-(length:--focus-ring-offset) focus-visible:outline-primary focus-visible:outline-solid',
        'disabled:cursor-not-allowed disabled:border-disabled-bg disabled:bg-disabled-bg disabled:text-disabled-text',
        VARIANTS[variant],
        SIZES[size],
        inactive && 'cursor-not-allowed',
        loading && 'opacity-80',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner label={loadingLabel} /> : icon}
      <span>{children}</span>
    </button>
  );
}
