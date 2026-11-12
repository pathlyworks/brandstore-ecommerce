/**
 * src/utils/validate.js
 *
 * Client-side checks that mirror the API 400 rules (email, address fields) so most errors are caught before a request.
 */

/** @typedef {{ field: string, message: string }} FieldError */

// Newsletter email rules (moved from the Phase 1 newsletter script so they can be unit tested).
const EMAIL_MAX_LENGTH = 120;
const LOCAL_PART_PATTERN = /^[A-Za-z0-9._%+'-]+$/;
const DOMAIN_PATTERN = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/**
 * Return the first problem with an email address as a sentence that says
 * what to do, or an empty string when the address is acceptable.
 * @param {string} value  Raw field value.
 * @returns {string}
 */
export function getEmailError(value) {
  const email = value.trim();
  const atIndex = email.indexOf('@');
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (email === '') {
    return 'Enter your email address.';
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return 'That address is too long. Use ' + EMAIL_MAX_LENGTH + ' characters or fewer.';
  }
  if (/\s/.test(email)) {
    return 'Remove the spaces from the email address.';
  }
  if (atIndex === -1) {
    return 'Add an “@” to the email address, like name@example.com.';
  }
  if (email.indexOf('@', atIndex + 1) !== -1) {
    return 'Use only one “@” in the email address.';
  }
  if (local === '') {
    return 'Add the part before the “@”, like name.';
  }
  if (!LOCAL_PART_PATTERN.test(local)) {
    return "The part before the “@” can only use letters, numbers and . _ % + ' -";
  }
  if (domain === '') {
    return 'Add the part after the “@”, like example.com.';
  }
  if (domain.indexOf('.') === -1) {
    return 'The part after the “@” needs a dot, like example.com.';
  }
  if (!DOMAIN_PATTERN.test(domain)) {
    return 'Check the domain after the “@”: no empty parts between dots and no unusual characters.';
  }
  return '';
}

/** Minimum password length (the TechSphere API's /auth/register rule). */
export const PASSWORD_MIN = 8;

/**
 * Sign-in form: an email address and a password. (Whether they are right is the server's job.)
 * @param {{ email: string, password: string }} input
 * @returns {FieldError[]} in form order; empty when valid
 */
export function validateLogin({ email = '', password = '' }) {
  const errors = [];
  const emailError = getEmailError(email);
  if (emailError) errors.push({ field: 'email', message: emailError });
  if (!password) errors.push({ field: 'password', message: 'Enter your password.' });
  return errors;
}

/**
 * Registration form: name, email, password (min 8 characters) and a matching confirmation.
 * @param {{ name: string, email: string, password: string, confirm: string }} input
 * @returns {FieldError[]}
 */
export function validateRegister({ name = '', email = '', password = '', confirm = '' }) {
  const errors = [];
  if (!name.trim()) errors.push({ field: 'name', message: 'Enter your name.' });
  else if (name.trim().length > 80)
    errors.push({ field: 'name', message: 'Use 80 characters or fewer.' });
  const emailError = getEmailError(email);
  if (emailError) errors.push({ field: 'email', message: emailError });
  if (password.length < PASSWORD_MIN) {
    errors.push({ field: 'password', message: `Use at least ${PASSWORD_MIN} characters.` });
  }
  if (!confirm) errors.push({ field: 'confirm', message: 'Type the password again.' });
  else if (confirm !== password)
    errors.push({ field: 'confirm', message: 'The two passwords do not match.' });
  return errors;
}

/**
 * Address form: the city is required (as in PUT /account/addresses/{id}); street is optional.
 * @param {{ city?: string, street?: string }} input
 * @returns {FieldError[]}
 */
export function validateAddress({ city = '', street = '' }) {
  const errors = [];
  if (!city.trim()) errors.push({ field: 'city', message: 'Enter the city.' });
  else if (city.trim().length > 60)
    errors.push({ field: 'city', message: 'Use 60 characters or fewer.' });
  if (street.trim().length > 120)
    errors.push({ field: 'street', message: 'Use 120 characters or fewer.' });
  return errors;
}
