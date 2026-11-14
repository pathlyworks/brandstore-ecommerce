/**
 * Cart totals, derived from the cart state and never stored (so the header badge, the cart page and the
 * checkout review cannot disagree). All money is integer cents: no floating-point sums.
 *
 * Shipping (the legacy rule, src/utils/cart-math.js, and the reference fixture tests/fixtures/cart-cases.json):
 * free from 100.00 of subtotal, otherwise a flat 7.99, nothing for an empty cart. No tax. Prices are in the
 * cart's currency (EGP from the TechSphere API), so with its catalogue every order ships free.
 *
 * A line whose product is out of stock (stock 0 after re-pricing) stays in the cart for the shopper to see
 * but is not charged and not ordered.
 */
import type { ApiOrderLine } from '@shared/api';
import type { CartItem, CartTotals, Cents } from '@shared/domain';
import type { CartState } from './cart.reducer';

/** Subtotal (cents) from which shipping is free. */
export const FREE_SHIPPING_FROM: Cents = 10_000;
/** Flat shipping (cents) below that. */
export const SHIPPING_FEE: Cents = 799;

/** Lines that are charged and ordered: in stock, with a readable price. */
export function selectChargeableLines(state: CartState): readonly CartItem[] {
  return state.lines.filter((l) => l.stock > 0 && Number.isFinite(l.unitPrice));
}

/** Lines kept in the cart but not charged (out of stock). */
export function selectUnavailableLines(state: CartState): readonly CartItem[] {
  return state.lines.filter((l) => !(l.stock > 0 && Number.isFinite(l.unitPrice)));
}

/** Every unit in the cart (the header badge). */
export function selectItemCount(state: CartState): number {
  return state.lines.reduce((n, l) => n + l.quantity, 0);
}

export function selectLineTotal(line: CartItem): Cents {
  return line.unitPrice * line.quantity;
}

export function selectSubtotal(state: CartState): Cents {
  return selectChargeableLines(state).reduce((sum, l) => sum + selectLineTotal(l), 0);
}

export function shippingFor(subtotal: Cents): Cents {
  return subtotal <= 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
}

export function selectTotals(state: CartState): CartTotals {
  const chargeable = selectChargeableLines(state);
  const subtotal = selectSubtotal(state);
  const shipping = shippingFor(subtotal);
  return {
    itemCount: chargeable.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    shipping,
    total: subtotal + shipping,
    freeShippingRemaining:
      subtotal > 0 && subtotal < FREE_SHIPPING_FROM ? FREE_SHIPPING_FROM - subtotal : 0,
    currency: state.lines[0]?.currency ?? 'EGP',
  };
}

/** The body lines of POST /orders: chargeable lines only, in cart order. */
export function selectOrderItems(state: CartState): ApiOrderLine[] {
  return selectChargeableLines(state).map((l) => ({ productId: l.productId, qty: l.quantity }));
}
