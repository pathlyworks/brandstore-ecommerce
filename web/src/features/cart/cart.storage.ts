/**
 * Versioned cart persistence (localStorage). The cart is saved as an envelope:
 *
 *   localStorage["brandstore:cart"] = { "version": 2, "savedAt": "2026-11-14T13:00:00.000Z", "lines": [...] }
 *
 * - `version` says which shape `lines` has. Reading goes through `migrate`, one step per version, so an old
 *   cart is upgraded instead of lost. Version 1 is the legacy pages' cart ({ lines } under
 *   "brandstore:cart:v1", no envelope); it is read once, when the new key is empty, and left in place for the
 *   legacy pages.
 * - A version newer than this code knows (a newer deploy in another tab) is not guessed at: the cart starts
 *   empty in memory and the stored value is NOT overwritten until the shopper changes the cart.
 * - Whatever the version, every line is validated and repaired (`sanitizeLines`): wrong types are dropped,
 *   quantities are capped to 1…min(stock, 10), duplicate products are merged. Stored data is never trusted.
 * - Storage that is blocked or full never breaks the cart: it keeps working in memory.
 */
import type { CartItem, ProductImage } from '@shared/domain';
import { EMPTY_CART, MAX_PER_LINE, type CartState } from './cart.reducer';

export const CART_STORAGE_KEY = 'brandstore:cart';
export const LEGACY_CART_KEY = 'brandstore:cart:v1';
export const CART_STORAGE_VERSION = 2;

export interface StoredCartV2 {
  version: 2;
  savedAt: string;
  lines: CartItem[];
}

export type LoadResult =
  | { status: 'empty'; state: CartState }
  | { status: 'loaded'; state: CartState; fromVersion: number; repaired: boolean }
  | { status: 'unreadable'; state: CartState }
  | { status: 'newer-version'; state: CartState; version: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toImage(value: unknown): ProductImage | null {
  if (!isRecord(value) || typeof value.url !== 'string') return null;
  return { url: value.url, alt: typeof value.alt === 'string' ? value.alt : '' };
}

/** Valid, capped, de-duplicated lines from anything. */
export function sanitizeLines(input: unknown): { lines: CartItem[]; repaired: boolean } {
  if (!Array.isArray(input)) return { lines: [], repaired: input !== undefined };
  const byId = new Map<string, CartItem>();
  let repaired = false;
  for (const raw of input) {
    const image = isRecord(raw) ? toImage(raw.image) : null;
    if (
      !isRecord(raw) ||
      typeof raw.productId !== 'string' ||
      raw.productId === '' ||
      typeof raw.name !== 'string' ||
      typeof raw.unitPrice !== 'number' ||
      !Number.isInteger(raw.unitPrice) ||
      raw.unitPrice < 0 ||
      typeof raw.quantity !== 'number' ||
      typeof raw.stock !== 'number' ||
      !image
    ) {
      repaired = true;
      continue;
    }
    const stock = Math.max(0, Math.floor(raw.stock));
    const previous = byId.get(raw.productId)?.quantity ?? 0;
    const wanted = Math.floor(raw.quantity) + previous;
    const quantity = Math.max(1, Math.min(wanted, stock > 0 ? stock : wanted, MAX_PER_LINE));
    if (quantity !== raw.quantity || previous > 0 || stock !== raw.stock) repaired = true;
    byId.set(raw.productId, {
      productId: raw.productId,
      name: raw.name,
      unitPrice: raw.unitPrice,
      currency: 'EGP',
      quantity,
      stock,
      image,
    });
  }
  return { lines: [...byId.values()], repaired };
}

/** Upgrade a stored value of any known version to the current lines. */
export function migrate(data: unknown): LoadResult {
  if (!isRecord(data)) return { status: 'unreadable', state: EMPTY_CART };
  const version = data.version === undefined ? 1 : data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    return { status: 'unreadable', state: EMPTY_CART };
  if (version > CART_STORAGE_VERSION)
    return { status: 'newer-version', state: EMPTY_CART, version };
  // v1 (legacy { lines }) and v2 store the same line shape; v2 adds the envelope. A future v3 adds a step here.
  const { lines, repaired } = sanitizeLines(data.lines);
  return { status: 'loaded', state: { lines }, fromVersion: version, repaired };
}

export function parseStoredCart(text: string | null): LoadResult {
  if (text === null) return { status: 'empty', state: EMPTY_CART };
  try {
    return migrate(JSON.parse(text));
  } catch {
    return { status: 'unreadable', state: EMPTY_CART };
  }
}

export function serializeCart(state: CartState, now: Date): string {
  const stored: StoredCartV2 = {
    version: CART_STORAGE_VERSION,
    savedAt: now.toISOString(),
    lines: [...state.lines],
  };
  return JSON.stringify(stored);
}

/** Read the cart: the current key, else (once) the legacy pages' cart. */
export function loadCart(storage: Storage | null): LoadResult {
  if (!storage) return { status: 'empty', state: EMPTY_CART };
  try {
    const current = parseStoredCart(storage.getItem(CART_STORAGE_KEY));
    if (current.status !== 'empty') return current;
    return parseStoredCart(storage.getItem(LEGACY_CART_KEY));
  } catch {
    return { status: 'empty', state: EMPTY_CART };
  }
}

/** Save; false when storage refused (blocked or full). */
export function saveCart(storage: Storage | null, state: CartState, now = new Date()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(CART_STORAGE_KEY, serializeCart(state, now));
    return true;
  } catch {
    return false;
  }
}

/** window.localStorage, or null where reading it throws (blocked cookies, some private modes). */
export function browserStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window[kind];
  } catch {
    return null;
  }
}
