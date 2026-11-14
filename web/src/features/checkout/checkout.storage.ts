/**
 * Where the checkout keeps its state between page loads (sessionStorage: this tab only, gone when it closes):
 * - "brandstore:checkout:v1": the draft (address, payment choice, idempotency key, touched steps);
 * - "brandstore:orders-placed:v1": the orders placed in this tab, so the confirmation page survives a refresh
 *   and a second "Place order" for the same key is recognised.
 * Both are validated when read; anything unreadable is replaced by a fresh value.
 */
import type { Cents } from '@shared/domain';
import { browserStorage } from '../cart/cart.storage';
import {
  CHECKOUT_STEPS,
  EMPTY_ADDRESS,
  EMPTY_PAYMENT,
  newDraft,
  type CheckoutDraft,
  type CheckoutStep,
} from './checkout.model';

export const DRAFT_KEY = 'brandstore:checkout:v1';
export const PLACED_KEY = 'brandstore:orders-placed:v1';

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function strings<T extends object>(defaults: T, value: unknown): T {
  const source = record(value);
  const out = Object.assign({}, defaults) as Record<string, unknown>;
  for (const key of Object.keys(defaults)) {
    const v = source[key];
    if (typeof v === 'string') out[key] = v.slice(0, 200);
  }
  return out as T;
}

export function parseDraft(text: string | null, makeKey: () => string): CheckoutDraft {
  try {
    const data = record(text ? JSON.parse(text) : null);
    if (data.version !== 1 || typeof data.idempotencyKey !== 'string' || !data.idempotencyKey)
      return newDraft(makeKey());
    const touched = Array.isArray(data.touched)
      ? data.touched.filter((s): s is CheckoutStep => CHECKOUT_STEPS.includes(s as CheckoutStep))
      : [];
    return {
      version: 1,
      address: strings(EMPTY_ADDRESS, data.address),
      payment: strings(EMPTY_PAYMENT, data.payment),
      idempotencyKey: data.idempotencyKey,
      touched,
    };
  } catch {
    return newDraft(makeKey());
  }
}

export function loadDraft(makeKey: () => string): CheckoutDraft {
  const storage = browserStorage('sessionStorage');
  try {
    return parseDraft(storage?.getItem(DRAFT_KEY) ?? null, makeKey);
  } catch {
    return newDraft(makeKey());
  }
}

export function saveDraft(draft: CheckoutDraft): void {
  try {
    browserStorage('sessionStorage')?.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // blocked or full: the draft still lives in memory for this page load
  }
}

export function clearDraft(): void {
  try {
    browserStorage('sessionStorage')?.removeItem(DRAFT_KEY);
  } catch {
    // nothing to clear
  }
}

/** What the confirmation page shows (the API returns only id, number and status). */
export interface PlacedOrderRecord {
  id: string;
  number: string;
  status: string;
  idempotencyKey: string;
  placedAt: string;
  itemCount: number;
  total: Cents;
  currency: string;
  deliverTo: string;
  payment: string;
}

function isPlaced(value: unknown): value is PlacedOrderRecord {
  const r = record(value);
  return (
    typeof r.id === 'string' &&
    typeof r.number === 'string' &&
    typeof r.idempotencyKey === 'string' &&
    typeof r.total === 'number' &&
    typeof r.itemCount === 'number'
  );
}

export function loadPlacedOrders(): PlacedOrderRecord[] {
  try {
    const data: unknown = JSON.parse(browserStorage('sessionStorage')?.getItem(PLACED_KEY) ?? '[]');
    return Array.isArray(data) ? data.filter(isPlaced) : [];
  } catch {
    return [];
  }
}

export function rememberPlacedOrder(order: PlacedOrderRecord): void {
  const list = [
    order,
    ...loadPlacedOrders().filter((o) => o.idempotencyKey !== order.idempotencyKey),
  ].slice(0, 10);
  try {
    browserStorage('sessionStorage')?.setItem(PLACED_KEY, JSON.stringify(list));
  } catch {
    // the confirmation still shows from the URL's order number
  }
}
