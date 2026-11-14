/**
 * The one HTTP client (fetch): JSON in and out, the Bearer token only in the Authorization header, an
 * AbortSignal for cleanup, and every failure turned into an ApiError the UI can describe.
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
  if (status === 401)
    return /invalid credentials/i.test(message) ? 'INVALID_CREDENTIALS' : 'UNAUTHENTICATED';
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
  token?: string | null;
  signal?: AbortSignal;
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
  const { method = 'GET', query, body, token, signal } = options;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
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
