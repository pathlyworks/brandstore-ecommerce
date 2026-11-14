/** useApi: no race between requests, no state update after unmount, retry, and "do not fetch yet". */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { useApi, type Loader } from './useApi';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useApi', () => {
  it('loads, then shows the data', async () => {
    const { result } = renderHook(() => useApi('a', () => Promise.resolve('data')));
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('data');
  });

  it('ignores a slow answer to an old key (no race)', async () => {
    const first = deferred<string>();
    const second = deferred<string>();
    const signals: AbortSignal[] = [];
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) =>
        useApi(id, (signal) => {
          signals.push(signal);
          return id === 'page-1' ? first.promise : second.promise;
        }),
      { initialProps: { id: 'page-1' } },
    );
    rerender({ id: 'page-2' });
    expect(signals[0]?.aborted).toBe(true); // the cleanup of the first run aborted it

    await act(async () => {
      second.resolve('page 2');
      await second.promise;
    });
    await act(async () => {
      first.resolve('page 1');
      await first.promise;
    }); // arrives last, must not win
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe('page 2');
  });

  it('aborts on unmount and never updates state afterwards', async () => {
    const pending = deferred<string>();
    let seen: AbortSignal | undefined;
    const errorSpy = vi.spyOn(console, 'error');
    const { unmount } = renderHook(() =>
      useApi('x', (signal) => {
        seen = signal;
        return pending.promise;
      }),
    );
    unmount();
    expect(seen?.aborted).toBe(true);
    await act(async () => {
      pending.resolve('late');
      await pending.promise;
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('keeps the previous data while the next key loads', async () => {
    const next = deferred<string>();
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) =>
        useApi(id, () => (id === 'one' ? Promise.resolve('one') : next.promise)),
      { initialProps: { id: 'one' } },
    );
    await waitFor(() => expect(result.current.data).toBe('one'));
    rerender({ id: 'two' });
    expect(result.current.status).toBe('loading');
    expect(result.current.data).toBe('one');
    await act(async () => {
      next.resolve('two');
      await next.promise;
    });
    expect(result.current.data).toBe('two');
  });

  it('turns failures into an AppError and retries on demand', async () => {
    const load = vi
      .fn<Loader<string>>()
      .mockRejectedValueOnce(new ApiError(429, 'Too many requests', 3))
      .mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useApi('r', load));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfter: 3,
    });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('does not fetch while the key is null', () => {
    const load = vi.fn<Loader<string>>();
    const { result } = renderHook(() => useApi(null, load));
    expect(result.current.status).toBe('idle');
    expect(load).not.toHaveBeenCalled();
  });
});
