/**
 * The session as data: what the token says, whether it is still valid, and how it is stored. Pure functions
 * (the storage object is passed in), used by AuthContext and the tests.
 *
 * The TechSphere token is a JWT-shaped string whose middle part is base64url JSON { sub, role, exp }. The
 * client reads `exp` (to end the session on time) and `role` (to show or hide the admin area). It cannot
 * verify the signature (the mock signs nothing: "alg": "none"), so these claims only decide what the UI
 * shows; the API checks the token on every request and is the real gate (task_4_security.md §2).
 */
import type { AuthSession, User } from '@shared/domain';

type Role = User['role'];

/** sessionStorage key, shared with the legacy pages (same shape). */
export const SESSION_KEY = 'brandstore:session:v1';
/** localStorage key written on sign-out, so other tabs of this browser sign out too. */
export const SIGN_OUT_SIGNAL_KEY = 'brandstore:signed-out';

export interface TokenClaims {
  sub?: string;
  role?: Role;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

/** The token's claims; an unreadable token gets the API's lifetime (an hour) and no role. */
export function readClaims(token: string, now = Date.now()): TokenClaims {
  try {
    const part = token.split('.')[1] ?? '';
    const json = atob(
      part
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(part.length / 4) * 4, '='),
    );
    const data = JSON.parse(json) as { sub?: unknown; role?: unknown; exp?: unknown };
    return {
      ...(typeof data.sub === 'string' ? { sub: data.sub } : {}),
      ...(data.role === 'admin' || data.role === 'shopper' ? { role: data.role } : {}),
      expiresAt: typeof data.exp === 'number' ? data.exp * 1000 : now + 3_600_000,
    };
  } catch {
    return { expiresAt: now + 3_600_000 };
  }
}

/** A session from the API's { token, user }: expiry and role come from the token when it has them. */
export function sessionFromToken(
  token: string,
  user: { email: string; name?: string; role?: Role },
  now = Date.now(),
): AuthSession {
  const claims = readClaims(token, now);
  return {
    token,
    expiresAt: claims.expiresAt,
    user: { email: user.email, name: user.name ?? '', role: claims.role ?? user.role ?? 'shopper' },
  };
}

/** Valid = present and not expired. Every protected screen and every authenticated request checks this. */
export function isSessionValid(
  session: AuthSession | null,
  now = Date.now(),
): session is AuthSession {
  return session !== null && session.expiresAt > now;
}

/** A stored session, or null when missing, malformed or expired. */
export function parseStoredSession(text: string | null, now = Date.now()): AuthSession | null {
  if (!text) return null;
  try {
    const data = JSON.parse(text) as Partial<AuthSession> | null;
    const user = data?.user;
    if (
      !data ||
      typeof data.token !== 'string' ||
      typeof data.expiresAt !== 'number' ||
      !user ||
      typeof user.email !== 'string'
    )
      return null;
    // The role is re-read from the token, so editing the stored "role" does not open the admin area.
    const session = sessionFromToken(data.token, user, now);
    return isSessionValid(session, now) ? session : null;
  } catch {
    return null;
  }
}

/**
 * Where to go after signing in: a path on this site only (never "//evil.example", "https://…" or "/\evil"),
 * and never back to the sign-in or register pages.
 */
export function safeNext(next: string | null, fallback = '/account/orders'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\'))
    return fallback;
  if (/^\/(login|register)(\/|\?|$)/.test(next)) return fallback;
  return next;
}
