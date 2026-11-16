import { describe, expect, it } from 'vitest';
import { freshToken } from '../test/fixtures';
import { authReducer } from './AuthContext';
import {
  isSessionValid,
  parseStoredSession,
  readClaims,
  safeNext,
  sessionFromToken,
} from './session';

const NOW = Date.UTC(2026, 10, 14, 12);

describe('token claims and stored sessions', () => {
  it('reads exp and role from the token', () => {
    const claims = readClaims(freshToken('a@b.test', NOW, 'admin', 600), NOW);
    expect(claims).toEqual({ sub: 'a@b.test', role: 'admin', expiresAt: NOW + 600_000 });
  });

  it('takes the role from the token, not from what was stored', () => {
    const stored = JSON.stringify({
      token: freshToken('s@b.test', NOW, 'shopper'),
      expiresAt: NOW + 3_600_000,
      user: { email: 's@b.test', name: 'S', role: 'admin' }, // edited in DevTools
    });
    expect(parseStoredSession(stored, NOW)?.user.role).toBe('shopper');
  });

  it('drops expired, malformed and missing sessions', () => {
    const expired = JSON.stringify({
      token: freshToken('s@b.test', NOW, 'shopper', -1),
      expiresAt: NOW - 1000,
      user: { email: 's@b.test' },
    });
    expect(parseStoredSession(expired, NOW)).toBeNull();
    expect(parseStoredSession('{"token":1}', NOW)).toBeNull();
    expect(parseStoredSession('not json', NOW)).toBeNull();
    expect(parseStoredSession(null, NOW)).toBeNull();
  });

  it('is valid only before exp', () => {
    const session = sessionFromToken(
      freshToken('s@b.test', NOW, 'shopper', 60),
      { email: 's@b.test' },
      NOW,
    );
    expect(isSessionValid(session, NOW + 59_000)).toBe(true);
    expect(isSessionValid(session, NOW + 60_000)).toBe(false);
    expect(isSessionValid(null, NOW)).toBe(false);
  });
});

describe('safeNext: only same-site destinations', () => {
  it.each([
    ['/account/orders?page=2', '/account/orders?page=2'],
    ['/checkout/review', '/checkout/review'],
    ['//evil.example/x', '/account/orders'],
    ['https://evil.example', '/account/orders'],
    ['/\\evil.example', '/account/orders'],
    ['/login?next=/x', '/account/orders'],
    ['/register', '/account/orders'],
    [null, '/account/orders'],
  ])('%s → %s', (next, expected) => {
    expect(safeNext(next)).toBe(expected);
  });
});

describe('authReducer', () => {
  const session = sessionFromToken(freshToken('s@b.test', NOW), { email: 's@b.test' }, NOW);
  it('signs in, expires (remembering why) and signs out', () => {
    const signedIn = authReducer({ session: null, ended: 'none' }, { type: 'signIn', session });
    expect(signedIn).toEqual({ session, ended: 'none' });
    expect(authReducer(signedIn, { type: 'expire' })).toEqual({ session: null, ended: 'expired' });
    expect(authReducer(signedIn, { type: 'signOut' })).toEqual({
      session: null,
      ended: 'signed-out',
    });
  });
  it('ignores a second expire (several requests failing at once)', () => {
    const ended = { session: null, ended: 'expired' as const };
    expect(authReducer(ended, { type: 'expire' })).toBe(ended);
  });
});
