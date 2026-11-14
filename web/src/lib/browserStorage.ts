/**
 * The browser's storage objects, read in one place so the cart and checkout modules stay pure: they receive a
 * Storage (or null) as an argument and never touch window themselves.
 */

/** window.localStorage or window.sessionStorage, or null where reading it throws (blocked cookies, some private modes). */
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}
