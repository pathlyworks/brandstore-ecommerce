/**
 * The three non-data states every async view shows, in one place: loading (a status announcement),
 * error (an alert with a next step) and empty (a plain message with an optional action).
 */
import type { ReactNode } from 'react';
import type { AppError } from '@shared/domain';
import { Button } from './Button';
import { Spinner } from './Spinner';

/** What to tell the shopper for each kind of failure. */
export function errorText(error: AppError): { title: string; message: string } {
  switch (error.code) {
    case 'NOT_FOUND':
      return { title: 'Not found', message: 'We could not find what you asked for.' };
    case 'RATE_LIMITED':
      return {
        title: 'Too many requests',
        message: `Wait ${error.retryAfter ? `${error.retryAfter} seconds` : 'a moment'}, then try again.`,
      };
    case 'NETWORK':
      return {
        title: 'Could not reach the store',
        message: 'Check your connection, then try again.',
      };
    case 'UNAUTHENTICATED':
      return { title: 'Please sign in again', message: 'Your session has ended.' };
    case 'VALIDATION_ERROR':
      return { title: 'Something in the request was not accepted', message: error.message };
    default:
      return {
        title: 'Something went wrong on our side',
        message: 'Please try again in a moment.',
      };
  }
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-xs p-md text-text-muted">
      <Spinner label={label} />
      <span aria-hidden="true">{label}…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  const { title, message } = errorText(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-xs rounded-md border-2 border-danger bg-surface p-md"
    >
      <h2 className="text-lg font-bold text-danger">{title}</h2>
      <p className="text-text">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-xs rounded-md border border-dashed border-border-control bg-surface p-md">
      <h2 className="text-lg font-bold text-text">{title}</h2>
      {children}
    </div>
  );
}
