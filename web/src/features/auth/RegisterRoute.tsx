/**
 * /register: create a shopper account (POST /auth/register → 201 { token, user }, signed in at once), then go
 * on to ?next= like sign-in does. Controlled form; the API's rules are checked first in the browser (email,
 * password of at least 8 characters) and its 400 answers are shown on the right field.
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { register } from '../../api/endpoints';
import { Button, Input } from '../../components';
import { errorText } from '../../components/StatusMessage';
import { toAppError } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../state/AuthContext';
import { isSessionValid, safeNext } from '../../state/session';

interface RegisterValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}
type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(v: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (!v.name.trim()) errors.name = 'Enter your name.';
  if (!v.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(v.email.trim()))
    errors.email = 'Enter an email address like name@example.com.';
  if (v.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (!v.confirm) errors.confirm = 'Enter the password again.';
  else if (v.confirm !== v.password) errors.confirm = 'The two passwords are not the same.';
  return errors;
}

const FIELDS: readonly {
  field: keyof RegisterValues;
  label: string;
  type: string;
  autoComplete: string;
  hint?: string;
}[] = [
  { field: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { field: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    field: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
    hint: 'At least 8 characters.',
  },
  { field: 'confirm', label: 'Password again', type: 'password', autoComplete: 'new-password' },
];

export function RegisterRoute() {
  useDocumentTitle('Create an account');
  const { session, signIn } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [values, setValues] = useState<RegisterValues>({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');

  if (isSessionValid(session)) return <Navigate to={next} replace />;

  function change(field: keyof RegisterValues, value: string) {
    const updated = { ...values, [field]: value };
    setValues(updated);
    if (submitted) setErrors(validateRegister(updated));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setSubmitted(true);
    const found = validateRegister(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;
    setPending(true);
    try {
      signIn(await register(values.name.trim(), values.email.trim(), values.password));
    } catch (error) {
      const appError = toAppError(error);
      if (appError.code === 'EMAIL_TAKEN')
        setErrors({ email: 'An account with this email already exists. Sign in instead.' });
      else
        setFormError(
          appError.code === 'VALIDATION_ERROR' ? appError.message : errorText(appError).message,
        );
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto flex w-full max-w-(--size-form-max) flex-col gap-md"
    >
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Create an account
      </h1>
      {formError && (
        <p role="alert" className="rounded-md border-2 border-danger bg-surface p-sm text-danger">
          {formError}
        </p>
      )}
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-sm">
        {FIELDS.map(({ field, label, type, autoComplete, hint }) => (
          <Input
            key={field}
            label={label}
            name={field}
            type={type}
            autoComplete={autoComplete}
            hint={hint}
            value={values[field]}
            onChange={(event) => change(field, event.target.value)}
            error={errors[field]}
          />
        ))}
        <Button type="submit" loading={pending} loadingLabel="Creating your account">
          Create account
        </Button>
      </form>
      <p className="text-text-muted">
        Already have an account?{' '}
        <Link
          to={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
