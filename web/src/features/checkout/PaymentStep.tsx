/**
 * /checkout/payment: a MOCK payment step. The shopper picks a test card, cash on delivery or a mobile wallet;
 * no card number is typed or stored (the TechSphere API takes no payment data).
 */
import { useNavigate } from 'react-router';
import { Button, Input, Select } from '../../components';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCheckout } from './CheckoutContext';
import { TEST_CARDS, type PaymentMethod, type TestCard } from './checkout.model';
import { ErrorSummary, fieldId, StepGuard, useStepSubmit } from './StepForm';

const METHODS: readonly { value: Exclude<PaymentMethod, ''>; label: string; hint: string }[] = [
  {
    value: 'card',
    label: 'Test card',
    hint: 'A Visa or Mastercard test card. Nothing is charged.',
  },
  { value: 'cod', label: 'Cash on delivery', hint: 'Pay the courier in cash.' },
  {
    value: 'wallet',
    label: 'Mobile wallet',
    hint: 'Pay from a mobile wallet when the courier arrives.',
  },
];

export function PaymentStep() {
  return (
    <StepGuard step="payment">
      <PaymentForm />
    </StepGuard>
  );
}

function PaymentForm() {
  useDocumentTitle('Checkout: payment method');
  const { draft, dispatch } = useCheckout();
  const navigate = useNavigate();
  const { errors, summaryErrors, summaryRef, onSubmit } = useStepSubmit(
    'payment',
    '/checkout/review',
  );
  const payment = draft.payment;
  const methodErrorId = `${fieldId('payment', 'method')}-error`;

  return (
    <section aria-labelledby="step-title" className="flex max-w-(--size-form-max) flex-col gap-md">
      <h2 id="step-title" className="text-h2 font-bold text-text">
        Payment method
      </h2>
      <ErrorSummary step="payment" errors={summaryErrors} summaryRef={summaryRef} />
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby="step-title"
        className="flex flex-col gap-sm"
      >
        <fieldset
          id={fieldId('payment', 'method')}
          tabIndex={-1}
          aria-describedby={errors.method ? methodErrorId : undefined}
          className="flex flex-col gap-xs rounded-md border border-border bg-surface p-md"
        >
          <legend className="px-2xs font-semibold text-text">How will you pay?</legend>
          {METHODS.map((method) => (
            <label
              key={method.value}
              className="flex min-h-(--size-tap-target) items-start gap-xs text-text"
            >
              <input
                type="radio"
                name="method"
                value={method.value}
                checked={payment.method === method.value}
                onChange={() => dispatch({ type: 'payment', field: 'method', value: method.value })}
                aria-invalid={errors.method ? true : undefined}
                className="mt-2xs size-5 accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{method.label}</span>
                <span className="text-sm text-text-muted">{method.hint}</span>
              </span>
            </label>
          ))}
          {errors.method && (
            <p id={methodErrorId} className="text-sm font-medium text-danger">
              {errors.method}
            </p>
          )}
        </fieldset>

        {payment.method === 'card' && (
          <>
            <Select<TestCard>
              id={fieldId('payment', 'testCard')}
              label="Test card"
              options={TEST_CARDS}
              value={payment.testCard}
              onChange={(value) => dispatch({ type: 'payment', field: 'testCard', value })}
              error={errors.testCard}
            />
            <Input
              id={fieldId('payment', 'nameOnCard')}
              label="Name on card"
              autoComplete="cc-name"
              value={payment.nameOnCard}
              onChange={(event) =>
                dispatch({ type: 'payment', field: 'nameOnCard', value: event.target.value })
              }
              error={errors.nameOnCard}
            />
          </>
        )}
        {payment.method === 'wallet' && (
          <Input
            id={fieldId('payment', 'walletPhone')}
            label="Wallet mobile number"
            autoComplete="tel"
            inputMode="tel"
            value={payment.walletPhone}
            onChange={(event) =>
              dispatch({ type: 'payment', field: 'walletPhone', value: event.target.value })
            }
            error={errors.walletPhone}
          />
        )}

        <div className="flex flex-wrap gap-xs">
          <Button
            type="button"
            variant="secondary"
            onClick={() => void navigate('/checkout/address')}
          >
            Back to address
          </Button>
          <Button type="submit">Continue to review</Button>
        </div>
      </form>
    </section>
  );
}
