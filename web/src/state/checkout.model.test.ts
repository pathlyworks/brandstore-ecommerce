/**
 * checkoutReducer, action by action (Task 6: a reducer test for every action), and the pure validation and
 * step rules the checkout screens rely on. The state is frozen, so a mutation would throw.
 */
import { describe, expect, it } from 'vitest';
import {
  blockingStep,
  checkoutReducer,
  describePayment,
  firstIncompleteStep,
  newDraft,
  newIdempotencyKey,
  normalisePhone,
  validateAddress,
  validatePayment,
  type CheckoutAction,
  type CheckoutDraft,
} from './checkout.model';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => deepFreeze(v));
    Object.freeze(value);
  }
  return value;
}
const start = () => deepFreeze(newDraft('key-1'));
const run = (actions: CheckoutAction[], draft: CheckoutDraft = start()) =>
  actions.reduce((d, a) => checkoutReducer(deepFreeze(d), a), draft);

const VALID: CheckoutAction[] = [
  { type: 'address', field: 'fullName', value: 'Mona Adel' },
  { type: 'address', field: 'phone', value: '010 1234 5678' },
  { type: 'address', field: 'street', value: '12 Tahrir Street' },
  { type: 'address', field: 'city', value: 'Dokki' },
  { type: 'address', field: 'governorate', value: 'giza' },
];

describe('checkoutReducer: every action', () => {
  it('address: sets one field and returns the same draft when nothing changes', () => {
    const draft = run([{ type: 'address', field: 'fullName', value: 'Mona' }]);
    expect(draft.address.fullName).toBe('Mona');
    expect(checkoutReducer(draft, { type: 'address', field: 'fullName', value: 'Mona' })).toBe(
      draft,
    );
  });

  it('useSavedAddress: fills street and city and remembers the saved address', () => {
    const draft = run([
      { type: 'useSavedAddress', id: 'a-1', street: '5 Nile St', city: 'Zamalek' },
    ]);
    expect(draft.address).toMatchObject({
      street: '5 Nile St',
      city: 'Zamalek',
      savedAddressId: 'a-1',
    });
  });

  it('address: typing into street or city detaches the saved address; other fields keep it', () => {
    const saved = run([
      { type: 'useSavedAddress', id: 'a-1', street: '5 Nile St', city: 'Zamalek' },
    ]);
    expect(
      run([{ type: 'address', field: 'fullName', value: 'Mona Adel' }], saved).address
        .savedAddressId,
    ).toBe('a-1');
    expect(
      run([{ type: 'address', field: 'city', value: 'Dokki' }], saved).address.savedAddressId,
    ).toBe('');
  });

  it('payment: sets one field, same draft when unchanged', () => {
    const draft = run([{ type: 'payment', field: 'method', value: 'wallet' }]);
    expect(draft.payment.method).toBe('wallet');
    expect(checkoutReducer(draft, { type: 'payment', field: 'method', value: 'wallet' })).toBe(
      draft,
    );
  });

  it('touch: records a step once', () => {
    const draft = run([
      { type: 'touch', step: 'address' },
      { type: 'touch', step: 'address' },
      { type: 'touch', step: 'payment' },
    ]);
    expect(draft.touched).toEqual(['address', 'payment']);
  });

  it('reset: replaces the draft (a new checkout gets a new idempotency key)', () => {
    const fresh = newDraft('key-2');
    expect(run([...VALID, { type: 'reset', draft: fresh }])).toBe(fresh);
  });

  it('never mutates the draft it was given', () => {
    const draft = start();
    const copy = structuredClone(draft);
    run(VALID, draft);
    expect(draft).toEqual(copy);
  });
});

describe('validation and step rules', () => {
  it('accepts Egyptian mobile numbers written with spaces, dashes or +20', () => {
    expect(normalisePhone('+20 101-234-5678')).toBe('01012345678');
    expect(validateAddress(run(VALID).address)).toEqual({});
    expect(validateAddress({ ...run(VALID).address, phone: '0161234567' }).phone).toMatch(
      /egyptian/i,
    );
  });

  it('an optional postal code must have 5 digits when given', () => {
    expect(validateAddress({ ...run(VALID).address, postalCode: '12345' })).toEqual({});
    expect(validateAddress({ ...run(VALID).address, postalCode: '1234' }).postalCode).toBeDefined();
  });

  it('payment: each method asks only for its own fields', () => {
    expect(validatePayment(start().payment)).toEqual({ method: 'Choose how you will pay.' });
    expect(validatePayment({ ...start().payment, method: 'cod' })).toEqual({});
    expect(Object.keys(validatePayment({ ...start().payment, method: 'card' })).sort()).toEqual([
      'nameOnCard',
      'testCard',
    ]);
    expect(Object.keys(validatePayment({ ...start().payment, method: 'wallet' }))).toEqual([
      'walletPhone',
    ]);
  });

  it('the first incomplete step, and the step that blocks skipping ahead', () => {
    expect(firstIncompleteStep(start())).toBe('address');
    const addressDone = run(VALID);
    expect(firstIncompleteStep(addressDone)).toBe('payment');
    expect(blockingStep(addressDone, 'review')).toBe('payment');
    const allDone = run([{ type: 'payment', field: 'method', value: 'cod' }], addressDone);
    expect(firstIncompleteStep(allDone)).toBe('review');
    expect(blockingStep(allDone, 'review')).toBeNull();
  });

  it('describes the payment for the review step', () => {
    expect(describePayment({ ...start().payment, method: 'cod' })).toBe('Cash on delivery');
    expect(
      describePayment({ ...start().payment, method: 'wallet', walletPhone: '+20 100 000 0000' }),
    ).toBe('Mobile wallet 01000000000');
    expect(describePayment(start().payment)).toBe('Not chosen');
  });

  it('idempotency keys are unique per checkout', () => {
    expect(newIdempotencyKey()).not.toBe(newIdempotencyKey());
  });
});
