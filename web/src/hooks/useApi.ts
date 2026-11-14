/**
 * useApi: fetch data in a component without races or leaks.
 *
 * - The effect depends on `key` (a string describing the request, e.g. "products?page=2") and on the retry
 *   counter: both are declared, nothing else is read from render scope (the loader is kept in a ref).
 * - Each run creates an AbortController and its cleanup aborts it, so when the key changes (or the component
 *   unmounts) the old request is cancelled, and an old answer that still arrives is ignored: a slow response
 *   to page 1 can never overwrite page 2, and nothing sets state after unmount.
 * - `key: null` means "do not fetch yet" (e.g. no token).
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { AppError } from '@shared/domain';
import { ApiError, isAbort } from '../api/client';

export type ApiState<T> =
  | { status: 'idle'; data: undefined; error: undefined }
  | { status: 'loading'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: undefined; error: AppError };

type Action<T> =
  | { type: 'idle' }
  | { type: 'start' }
  | { type: 'success'; data: T }
  | { type: 'failure'; error: AppError };

function reducer<T>(state: ApiState<T>, action: Action<T>): ApiState<T> {
  switch (action.type) {
    case 'idle':
      return { status: 'idle', data: undefined, error: undefined };
    case 'start':
      // Keep the previous data while the next request runs (no flash of empty content).
      return { status: 'loading', data: state.data, error: undefined };
    case 'success':
      return { status: 'success', data: action.data, error: undefined };
    case 'failure':
      return { status: 'error', data: undefined, error: action.error };
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof ApiError) return error;
  return new ApiError(0, error instanceof Error ? error.message : 'Something went wrong.');
}

export type Loader<T> = (signal: AbortSignal) => Promise<T>;

export function useApi<T>(
  key: string | null,
  load: Loader<T>,
): ApiState<T> & { retry: () => void } {
  const [state, dispatch] = useReducer(reducer<T>, {
    status: 'idle',
    data: undefined,
    error: undefined,
  });
  const [attempt, bump] = useReducer((n: number) => n + 1, 0);
  const loadRef = useRef(load);

  // The latest loader, kept in a ref so the fetch effect below does not restart when it changes
  // (it is usually an inline arrow).
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    if (key === null) {
      dispatch({ type: 'idle' });
      return undefined;
    }
    const controller = new AbortController();
    dispatch({ type: 'start' });
    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) dispatch({ type: 'success', data });
      },
      (error: unknown) => {
        if (!controller.signal.aborted && !isAbort(error))
          dispatch({ type: 'failure', error: toAppError(error) });
      },
    );
    return () => controller.abort();
  }, [key, attempt]);

  const retry = useCallback(() => bump(), []);
  return { ...state, retry };
}
