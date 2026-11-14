/** /checkout/address: who receives the order and where. A saved address (GET /account/addresses) can fill it. */
import { useLocation } from 'react-router';
import { Button, Input, Select } from '../../components';
import { ErrorState, LoadingState } from '../../components/StatusMessage';
import { fetchAddresses } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../auth/AuthContext';
import { useCheckout } from './CheckoutContext';
import { GOVERNORATES, type AddressDraft, type Governorate } from './checkout.model';
import { ErrorSummary, fieldId, useStepSubmit } from './StepForm';

type TextField = Exclude<keyof AddressDraft, 'governorate' | 'savedAddressId'>;

const FIELDS: readonly {
  field: TextField;
  label: string;
  autoComplete: string;
  hint?: string;
  inputMode?: 'tel' | 'numeric';
}[] = [
  { field: 'fullName', label: 'Full name', autoComplete: 'name' },
  {
    field: 'phone',
    label: 'Mobile number',
    autoComplete: 'tel',
    inputMode: 'tel',
    hint: 'The courier calls this number.',
  },
  { field: 'street', label: 'Street and building', autoComplete: 'address-line1' },
  { field: 'city', label: 'City or district', autoComplete: 'address-level2' },
  {
    field: 'postalCode',
    label: 'Postal code (optional)',
    autoComplete: 'postal-code',
    inputMode: 'numeric',
  },
];

export function AddressStep() {
  useDocumentTitle('Checkout: delivery address');
  const { draft, dispatch } = useCheckout();
  const { session } = useAuth();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const { errors, summaryErrors, summaryRef, onSubmit } = useStepSubmit(
    'address',
    '/checkout/payment',
  );
  const token = session?.token ?? null;
  const saved = useApi(token ? 'addresses' : null, (signal) => fetchAddresses(token ?? '', signal));
  const address = draft.address;

  return (
    <section aria-labelledby="step-title" className="flex max-w-(--size-form-max) flex-col gap-md">
      <h2 id="step-title" className="text-h2 font-bold text-text">
        Delivery address
      </h2>
      {notice && <p className="rounded-md bg-primary-soft p-sm text-text">{notice}</p>}
      <ErrorSummary step="address" errors={summaryErrors} summaryRef={summaryRef} />

      <fieldset className="flex flex-col gap-xs rounded-md border border-border bg-surface p-md">
        <legend className="px-2xs font-semibold text-text">Your saved addresses</legend>
        {saved.status === 'loading' && <LoadingState label="Loading your saved addresses" />}
        {saved.status === 'error' && <ErrorState error={saved.error} onRetry={saved.retry} />}
        {saved.status === 'success' && saved.data.length === 0 && (
          <p className="text-text-muted">You have no saved addresses. Enter one below.</p>
        )}
        {saved.status === 'success' &&
          saved.data.map((option) => (
            <label
              key={option.id}
              className="flex min-h-(--size-tap-target) items-center gap-xs text-text"
            >
              <input
                type="radio"
                name="saved-address"
                value={option.id}
                checked={address.savedAddressId === option.id}
                onChange={() =>
                  dispatch({
                    type: 'useSavedAddress',
                    id: option.id,
                    street: option.street,
                    city: option.city,
                  })
                }
                className="size-5 accent-primary"
              />
              {option.street}, {option.city}
            </label>
          ))}
      </fieldset>

      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby="step-title"
        className="flex flex-col gap-sm"
      >
        {FIELDS.map(({ field, label, autoComplete, hint, inputMode }) => (
          <Input
            key={field}
            id={fieldId('address', field)}
            label={label}
            name={field}
            autoComplete={autoComplete}
            inputMode={inputMode}
            hint={hint}
            value={address[field]}
            onChange={(event) => dispatch({ type: 'address', field, value: event.target.value })}
            error={errors[field]}
          />
        ))}
        <Select<Governorate>
          id={fieldId('address', 'governorate')}
          label="Governorate"
          name="governorate"
          options={GOVERNORATES}
          value={address.governorate}
          onChange={(value) => dispatch({ type: 'address', field: 'governorate', value })}
          error={errors.governorate}
        />
        <div>
          <Button type="submit">Continue to payment</Button>
        </div>
      </form>
    </section>
  );
}
