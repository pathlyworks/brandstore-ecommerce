/**
 * The checkout draft: what the shopper has entered so far, kept in sessionStorage so it survives a refresh,
 * Back and Forward, and a detour to sign in, at every step. Pure types, reducer and validation (no React).
 *
 * The payment step is a MOCK: the shopper picks a test card, cash on delivery or a mobile wallet. No card
 * number is typed or stored; the TechSphere API takes no payment data.
 */
export const CHECKOUT_STEPS = ['address', 'payment', 'review'] as const;
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number];

export const STEP_LABELS: Record<CheckoutStep, string> = {
  address: 'Delivery address',
  payment: 'Payment method',
  review: 'Review and place order',
};

export type Governorate =
  | ''
  | 'cairo'
  | 'giza'
  | 'alexandria'
  | 'qalyubia'
  | 'dakahlia'
  | 'sharqia'
  | 'other';

export interface AddressDraft {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: Governorate;
  postalCode: string;
  /** The saved address (GET /account/addresses) this was filled from, if any. */
  savedAddressId: string;
}

export type PaymentMethod = '' | 'card' | 'cod' | 'wallet';
export type TestCard = '' | 'visa-4242' | 'mastercard-4444';

export interface PaymentDraft {
  method: PaymentMethod;
  testCard: TestCard;
  nameOnCard: string;
  walletPhone: string;
}

export interface CheckoutDraft {
  version: 1;
  address: AddressDraft;
  payment: PaymentDraft;
  /**
   * One key per checkout attempt, created with the draft and sent with POST /orders. Retrying after a failure
   * whose outcome is unknown (network error, timeout) sends the SAME key, so a server that honours it creates
   * the order once (see task_3_checkout.md, "Double submission").
   */
  idempotencyKey: string;
  /** Steps whose "Continue" was pressed: from then on their errors show as the shopper types. */
  touched: CheckoutStep[];
}

export type CheckoutAction =
  | { type: 'address'; field: keyof Omit<AddressDraft, 'savedAddressId'>; value: string }
  | { type: 'useSavedAddress'; id: string; street: string; city: string }
  | { type: 'payment'; field: keyof PaymentDraft; value: string }
  | { type: 'touch'; step: CheckoutStep }
  | { type: 'reset'; draft: CheckoutDraft };

export const EMPTY_ADDRESS: AddressDraft = {
  fullName: '',
  phone: '',
  street: '',
  city: '',
  governorate: '',
  postalCode: '',
  savedAddressId: '',
};

export const EMPTY_PAYMENT: PaymentDraft = {
  method: '',
  testCard: '',
  nameOnCard: '',
  walletPhone: '',
};

export function newDraft(idempotencyKey: string): CheckoutDraft {
  return {
    version: 1,
    address: EMPTY_ADDRESS,
    payment: EMPTY_PAYMENT,
    idempotencyKey,
    touched: [],
  };
}

/** A random key; crypto.randomUUID where the browser has it. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Pure: the next draft. Typing into a field that came from a saved address detaches it from that address. */
export function checkoutReducer(draft: CheckoutDraft, action: CheckoutAction): CheckoutDraft {
  switch (action.type) {
    case 'address': {
      if (draft.address[action.field] === action.value) return draft;
      const detach = action.field === 'street' || action.field === 'city';
      return {
        ...draft,
        address: {
          ...draft.address,
          [action.field]: action.value,
          savedAddressId: detach ? '' : draft.address.savedAddressId,
        },
      };
    }
    case 'useSavedAddress':
      return {
        ...draft,
        address: {
          ...draft.address,
          street: action.street,
          city: action.city,
          savedAddressId: action.id,
        },
      };
    case 'payment':
      return draft.payment[action.field] === action.value
        ? draft
        : { ...draft, payment: { ...draft.payment, [action.field]: action.value } };
    case 'touch':
      return draft.touched.includes(action.step)
        ? draft
        : { ...draft, touched: [...draft.touched, action.step] };
    case 'reset':
      return action.draft;
  }
}

// ---- Validation ------------------------------------------------------------------------------------------

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

/** An Egyptian mobile number: 01 then 0, 1, 2 or 5, then 8 digits (spaces, dashes and +20 allowed). */
export function normalisePhone(value: string): string {
  const digits = value.replace(/[\s-]/g, '');
  return digits.startsWith('+20') ? `0${digits.slice(3)}` : digits;
}
const MOBILE = /^01[0125]\d{8}$/;

export function validateAddress(a: AddressDraft): FieldErrors<AddressDraft> {
  const errors: FieldErrors<AddressDraft> = {};
  const name = a.fullName.trim();
  if (!name) errors.fullName = 'Enter the full name of the person receiving the order.';
  else if (name.length < 3 || !/\s/.test(name)) errors.fullName = 'Enter a first and a last name.';
  if (!a.phone.trim()) errors.phone = 'Enter a mobile number for the courier.';
  else if (!MOBILE.test(normalisePhone(a.phone)))
    errors.phone = 'Enter an Egyptian mobile number like 010 1234 5678.';
  if (!a.street.trim()) errors.street = 'Enter the street and building.';
  else if (a.street.trim().length < 5) errors.street = 'Enter the street and building number.';
  if (!a.city.trim()) errors.city = 'Enter the city or district.';
  if (!a.governorate) errors.governorate = 'Choose the governorate.';
  if (a.postalCode.trim() && !/^\d{5}$/.test(a.postalCode.trim()))
    errors.postalCode = 'A postal code has 5 digits.';
  return errors;
}

export function validatePayment(p: PaymentDraft): FieldErrors<PaymentDraft> {
  const errors: FieldErrors<PaymentDraft> = {};
  if (!p.method) {
    errors.method = 'Choose how you will pay.';
    return errors;
  }
  if (p.method === 'card') {
    if (!p.testCard) errors.testCard = 'Choose a test card.';
    const name = p.nameOnCard.trim();
    if (!name) errors.nameOnCard = 'Enter the name on the card.';
    else if (!/^[\p{L} .'-]{3,60}$/u.test(name))
      errors.nameOnCard = 'Use letters only, as printed on the card.';
  }
  if (p.method === 'wallet') {
    if (!p.walletPhone.trim()) errors.walletPhone = 'Enter the mobile number of the wallet.';
    else if (!MOBILE.test(normalisePhone(p.walletPhone)))
      errors.walletPhone = 'Enter an Egyptian mobile number like 010 1234 5678.';
  }
  return errors;
}

export function stepErrors(draft: CheckoutDraft, step: CheckoutStep): Record<string, string> {
  if (step === 'address') return validateAddress(draft.address) as Record<string, string>;
  if (step === 'payment') return validatePayment(draft.payment) as Record<string, string>;
  return {};
}

export function isStepValid(draft: CheckoutDraft, step: CheckoutStep): boolean {
  return Object.keys(stepErrors(draft, step)).length === 0;
}

/** The first step that still has errors, or "review" when the address and payment are complete. */
export function firstIncompleteStep(draft: CheckoutDraft): CheckoutStep {
  return CHECKOUT_STEPS.find((step) => !isStepValid(draft, step)) ?? 'review';
}

/** Steps before `step` that must be valid to open it (blocks skipping ahead by URL). */
export function blockingStep(draft: CheckoutDraft, step: CheckoutStep): CheckoutStep | null {
  const index = CHECKOUT_STEPS.indexOf(step);
  return CHECKOUT_STEPS.slice(0, index).find((s) => !isStepValid(draft, s)) ?? null;
}

// ---- Display ---------------------------------------------------------------------------------------------

export const GOVERNORATES: readonly { value: Governorate; label: string }[] = [
  { value: '', label: 'Choose…' },
  { value: 'cairo', label: 'Cairo' },
  { value: 'giza', label: 'Giza' },
  { value: 'alexandria', label: 'Alexandria' },
  { value: 'qalyubia', label: 'Qalyubia' },
  { value: 'dakahlia', label: 'Dakahlia' },
  { value: 'sharqia', label: 'Sharqia' },
  { value: 'other', label: 'Another governorate' },
];

export const TEST_CARDS: readonly { value: TestCard; label: string }[] = [
  { value: '', label: 'Choose…' },
  { value: 'visa-4242', label: 'Visa test card ending 4242' },
  { value: 'mastercard-4444', label: 'Mastercard test card ending 4444' },
];

export function describePayment(p: PaymentDraft): string {
  if (p.method === 'card')
    return TEST_CARDS.find((c) => c.value === p.testCard)?.label ?? 'Test card';
  if (p.method === 'wallet') return `Mobile wallet ${normalisePhone(p.walletPhone)}`;
  if (p.method === 'cod') return 'Cash on delivery';
  return 'Not chosen';
}
