/**
 * /login: a controlled form (email, password) validated on submit and as the shopper corrects a field; the
 * password goes only in the POST body. 401 says the email or password is wrong; after signing in the shopper
 * goes back to where they were sent from (?next=, same-site paths only) or to their orders.
 */
import { useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { login } from '../../api/endpoints';
import { Button, Input } from '../../components';
import { errorText } from '../../components/StatusMessage';
import { toAppError } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from './AuthContext';

interface LoginValues {
  email: string;
  password: string;
}
type LoginErrors = Partial<Record<keyof LoginValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL.test(values.email.trim()))
    errors.email = 'Enter an email address like name@example.com.';
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

/** Only a path on this site ("/account/orders"), never "//evil.example" or "https://…". */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/account/orders';
}

export function LoginRoute() {
  useDocumentTitle('Sign in');
  const { session, signIn } = useAuth();
  const [params] = useSearchParams();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState('');
  const next = safeNext(params.get('next'));

  // Signed in (now, or already when the page opened): go on. The redirect is the render, not an effect.
  if (session) return <Navigate to={next} replace />;

  function change(field: keyof LoginValues, value: string) {
    const updated = { ...values, [field]: value };
    setValues(updated);
    if (submitted) setErrors(validateLogin(updated));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const found = validateLogin(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;
    setPending(true);
    try {
      signIn(await login(values.email.trim(), values.password));
    } catch (error) {
      const appError = toAppError(error);
      setFormError(
        appError.status === 401
          ? 'The email or password is not right. Check them and try again.'
          : errorText(appError).message,
      );
      setValues((current) => ({ ...current, password: '' }));
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="page-title"
      className="mx-auto flex w-full max-w-(--size-form-max) flex-col gap-md"
    >
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Sign in
      </h1>
      {formError && (
        <p role="alert" className="rounded-md border-2 border-danger bg-surface p-sm text-danger">
          {formError}
        </p>
      )}
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-sm">
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={(event) => change('email', event.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(event) => change('password', event.target.value)}
          error={errors.password}
        />
        <Button type="submit" loading={pending} loadingLabel="Signing in">
          Sign in
        </Button>
      </form>
    </section>
  );
}
