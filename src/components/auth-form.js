/**
 * src/components/auth-form.js
 *
 * Shared behaviour of the sign-in and registration forms: validate on submit (accessible errors via
 * form-errors.js), disable the button while sending, and turn API errors into clear messages that
 * keep 400 and 401 apart:
 *   400 -> the details were not accepted (server message; "already registered" goes on the email field)
 *   401 -> wrong email or password (one message for both, so it does not reveal which was wrong)
 *   429 / 5xx / network -> the shared wording from api/errors.js
 * The password is read from the field when the form is sent and is never stored, logged or put in a URL.
 */
import * as dom from '../utils/dom.js';
import { describeError } from '../api/errors.js';
import { readFields, showErrors, clearErrors } from './form-errors.js';

/**
 * The message (and field errors) for a failed sign-in or registration.
 * @param {any} error ApiError or other
 * @returns {{ general: string, fields: { field: string, message: string }[] }}
 */
export function authErrorMessage(error) {
  if (error?.status === 401) {
    return { general: 'The email or password is incorrect. Check them and try again.', fields: [] };
  }
  if (error?.code === 'EMAIL_TAKEN' || /already registered/i.test(error?.message || '')) {
    return {
      general: '',
      fields: [{ field: 'email', message: 'This email is already registered. Sign in instead.' }],
    };
  }
  if (error?.status === 400) {
    const fields = (error.details || [])
      .filter((d) => d.field)
      .map(({ field, message }) => ({ field, message: `The ${field} ${message}.` }));
    return { general: `The details were not accepted: ${error.message}`, fields };
  }
  const info = describeError(error);
  return { general: `${info.title}. ${info.message}`, fields: [] };
}

/**
 * @param {HTMLFormElement} form has `.form-summary`, the fields, and a submit button
 * @param {{ fields: string[], validate: (values: object) => object[], submit: (values: object) => Promise<void>,
 *   busyText: string }} options
 */
export function mountAuthForm(form, { fields, validate, submit, busyText }) {
  const button = dom.qs('button[type="submit"]', form);
  const idleText = button.textContent;
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); // never let the browser send the form (it would put nothing in the URL, but stay safe)
    const values = readFields(form, fields);
    const errors = validate(values);
    if (errors.length) return showErrors(form, errors);
    clearErrors(form);
    button.disabled = true;
    button.textContent = busyText;
    try {
      await submit(values);
    } catch (error) {
      const { general, fields: fieldErrors } = authErrorMessage(error);
      showErrors(form, fieldErrors, general);
    } finally {
      button.disabled = false;
      button.textContent = idleText;
    }
  });
}
