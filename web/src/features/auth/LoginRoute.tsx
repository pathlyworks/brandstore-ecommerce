/**
 * /login: the single sign-in path. Every protected screen and every refused request ends here with
 * ?next=<where the shopper was> (and reason=expired when the session ran out); after signing in the shopper
 * goes back there (same-site paths only), or to their orders. A controlled form (email, password) validated on
 * submit and as the shopper corrects a field; the password goes only in the POST body.
 */
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { login } from '../../api/endpoints';
import { Button, Input } from '../../components';
import { errorText } from '../../components/StatusMessage';
import { toAppError } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../state/AuthContext';
import { isSessionValid, safeNext } from '../../state/session';

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

/** Why the shopper is here, in words: shown above the form. */
export function signInReason(reason: string | null, next: string, ended: string): string {
  if (reason === 'expired' && next.startsWith('/checkout'))
    return 'Your session expired during checkout. Sign in again to finish your order: your cart and the details you entered are kept.';
  if (reason === 'expired')
    return 'Your session expired. Sign in again to continue where you were.';
  if (ended === 'signed-out') return 'You are signed out. Your cart is still here.';
  return '';
}

export function LoginRoute() {
  useDocumentTitle('Sign in');
  const { session, ended, signIn } = useAuth();
  const [params] = useSearchParams();
  const [values, setValues] = useState<LoginValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [summary, setSummary] = useState('');
  const [formError, setFormError] = useState('');
  const next = safeNext(params.get('next'));
  const notice = signInReason(params.get('reason'), next, ended);

  // Signed in (now, or already when the page opened): go on. The redirect is the render, not an effect.
  if (isSessionValid(session)) return <Navigate to={next} replace />;

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
    const fields = Object.keys(found);
    // One sentence for screen readers (the field messages are linked to their fields but not announced).
    setSummary(
      fields.length === 0
        ? ''
        : `${fields.length === 1 ? '1 field needs' : `${fields.length} fields need`} fixing: ${fields
            .map((f) => (f === 'email' ? 'Email' : 'Password'))
            .join(', ')}.`,
    );
    if (fields.length > 0) return;
    setPending(true);
    try {
      signIn(await login(values.email.trim(), values.password));
    } catch (error) {
      const appError = toAppError(error);
      setFormError(
        appError.code === 'INVALID_CREDENTIALS'
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
      {notice && (
        <p role="status" className="rounded-md bg-primary-soft p-sm text-text">
          {notice}
        </p>
      )}
      {/* Always in the page (empty until a submit finds problems), so screen readers announce its text. */}
      <p aria-live="assertive" className="sr-only">
        {summary}
      </p>
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
      <p className="text-text-muted">
        New here?{' '}
        <Link
          to={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
