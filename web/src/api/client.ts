/**
 * The one HTTP client (fetch): JSON in and out, the Bearer token only in the Authorization header, an
 * AbortSignal for cleanup, and every failure turned into an ApiError the UI can describe.
 *
 * It is also THE ONE PLACE that handles 401 for the session. A request marked `auth: true`:
 * - takes the token from the auth bridge (AuthContext connects it); no valid token → it is not sent at all;
 * - on a missing token or a 401 answer, calls `onUnauthorized` exactly once and throws an ApiError with code
 *   "UNAUTHENTICATED". AuthContext's handler ends the session as "expired"; ProtectedRoute then sends the
 *   shopper to /login?next=<where they were>&reason=expired — the single re-authentication path.
 * Components never look at 401: they show their error state, and the redirect replaces them. A 401 to a
 * request WITHOUT `auth` (sign-in with a wrong password) is a form error, code "INVALID_CREDENTIALS".
 */
import type { ApiError as ApiErrorBody } from '@shared/api';
import type { AppError } from '@shared/domain';
import { API_BASE } from '../config';

/** Something went wrong talking to the API (status 0 = no answer, e.g. offline). */
export class ApiError extends Error implements AppError {
  readonly status: number;
  readonly code: AppError['code'];
  readonly retryAfter: number | null;

  constructor(status: number, message: string, retryAfter: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = codeFor(status, message);
    this.retryAfter = retryAfter;
  }
}

function codeFor(status: number, message: string): AppError['code'] {
  if (status === 0) return 'NETWORK';
  if (status === 400)
    return /already registered/i.test(message) ? 'EMAIL_TAKEN' : 'VALIDATION_ERROR';
  // An authenticated request's 401 never gets here (sessionEnded); this is a 401 without a session.
  if (status === 401)
    return /session has ended/i.test(message) ? 'UNAUTHENTICATED' : 'INVALID_CREDENTIALS';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'ORDER_NOT_CANCELLABLE';
  if (status === 429) return 'RATE_LIMITED';
  return 'SERVER_ERROR';
}

/** Is this the AbortError of a cancelled request (not a failure to show)? */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** Send the session's Bearer token; a missing token or a 401 ends the session (see the file comment). */
  auth?: boolean;
  signal?: AbortSignal;
}

export type UnauthorizedReason = 'missing-token' | 'rejected';

/** How the client reaches the session without importing React: AuthContext connects it. */
export interface AuthBridge {
  /** The token, only while the session is valid (not expired). */
  getToken: () => string | null;
  onUnauthorized: (reason: UnauthorizedReason, path: string) => void;
}

const NO_SESSION: AuthBridge = { getToken: () => null, onUnauthorized: () => undefined };
let bridge: AuthBridge = NO_SESSION;

/** Connect the session; returns the disconnect function (for the provider's effect cleanup). */
export function connectAuth(next: AuthBridge): () => void {
  bridge = next;
  return () => {
    if (bridge === next) bridge = NO_SESSION;
  };
}

function sessionEnded(reason: UnauthorizedReason, path: string): ApiError {
  bridge.onUnauthorized(reason, path);
  return new ApiError(401, 'Your session has ended. Please sign in again.');
}

/** Build "/products?page=2&sort=rating" from a path and a query object (empty values are left out). */
export function withQuery(path: string, query: RequestOptions['query'] = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

/**
 * Call the API and parse its JSON as T. The caller states T from src/types/api.ts (checked against the
 * captured responses), so the response is typed at the boundary, once.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, auth = false, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = bridge.getToken();
    if (!token) throw sessionEnded('missing-token', path);
    headers.Authorization = `Bearer ${token}`;
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${withQuery(path, query)}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      signal: signal ?? null,
    });
  } catch (error) {
    if (isAbort(error)) throw error;
    throw new ApiError(0, 'Could not reach the store. Check your connection, then try again.');
  }
  if (response.status === 204) return null as T;
  const text = await response.text();
  const json: unknown = text ? safeJson(text) : null;
  if (response.status === 401 && auth) throw sessionEnded('rejected', path);
  if (!response.ok) {
    const message = isErrorBody(json) ? json.error : `HTTP ${response.status}`;
    const retry = Number(response.headers.get('Retry-After'));
    throw new ApiError(
      response.status,
      message,
      Number.isFinite(retry) && retry > 0 ? retry : null,
    );
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' && value !== null && typeof (value as ApiErrorBody).error === 'string'
  );
}
