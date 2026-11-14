/**
 * The client is the one place that handles 401: an authenticated request with no valid token is never sent,
 * and a 401 answer ends the session through the bridge — once per failed request. Unauthenticated 401s
 * (wrong password) are ordinary errors.
 */
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, server } from '../test/server';
import { connectAuth, request } from './client';

let disconnect: () => void = () => undefined;
afterEach(() => disconnect());

function bridge(token: string | null) {
  const onUnauthorized = vi.fn();
  disconnect = connectAuth({ getToken: () => token, onUnauthorized });
  return onUnauthorized;
}

describe('request: the single 401 handler', () => {
  it('sends the Bearer token of the connected session', async () => {
    let seen: string | null = null;
    server.use(
      http.get(api('/account/addresses'), ({ request: r }) => {
        seen = r.headers.get('Authorization');
        return HttpResponse.json([]);
      }),
    );
    bridge('abc.def.ghi');
    await request('/account/addresses', { auth: true });
    expect(seen).toBe('Bearer abc.def.ghi');
  });

  it('does not send an authenticated request without a valid token, and ends the session', async () => {
    const sent = vi.fn();
    server.use(http.get(api('/account/addresses'), () => (sent(), HttpResponse.json([]))));
    const onUnauthorized = bridge(null);
    await expect(request('/account/addresses', { auth: true })).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHENTICATED',
    });
    expect(sent).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith('missing-token', '/account/addresses');
  });

  it('ends the session when the API answers 401', async () => {
    server.use(
      http.get(api('/account/addresses'), () =>
        HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      ),
    );
    const onUnauthorized = bridge('expired.token.x');
    await expect(request('/account/addresses', { auth: true })).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    });
    expect(onUnauthorized).toHaveBeenCalledExactlyOnceWith('rejected', '/account/addresses');
  });

  it('treats a 401 to an unauthenticated request (wrong password) as a form error, not a session end', async () => {
    const onUnauthorized = bridge('abc.def.ghi');
    await expect(
      request('/auth/login', {
        method: 'POST',
        body: { email: 'student@techsphere.test', password: 'nope' },
      }),
    ).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not treat 403 as a session end', async () => {
    server.use(
      http.get(api('/admin/summary'), () =>
        HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
      ),
    );
    const onUnauthorized = bridge('abc.def.ghi');
    await expect(request('/admin/summary', { auth: true })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
