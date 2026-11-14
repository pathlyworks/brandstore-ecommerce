/**
 * Money in integer cents (ported from the legacy src/utils/money.js and api/techsphere.js priceToCents).
 */
import type { ApiPrice } from '@shared/api';
import type { Cents } from '@shared/domain';

/**
 * An API price (32999 or "EGP 33,999", whole pounds) in cents, or NaN when it cannot be read (never 0).
 * @example priceToCents('EGP 1,299.50') === 129950
 */
export function priceToCents(price: ApiPrice | null | undefined): Cents {
  if (typeof price === 'number')
    return Number.isFinite(price) ? Math.round(price * 100) : Number.NaN;
  if (typeof price !== 'string') return Number.NaN;
  const digits = price.replace(/[^\d.]/g, '');
  if (!/^\d+(\.\d+)?$/.test(digits)) return Number.NaN;
  return Math.round(Number(digits) * 100);
}

/** "EGP 2,499.00"; "Price unavailable" when the amount could not be read. */
export function formatMoney(cents: Cents, currency: string = 'EGP', locale = 'en-GB'): string {
  if (!Number.isFinite(cents)) return 'Price unavailable';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
