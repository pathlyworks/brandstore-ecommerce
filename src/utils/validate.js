/**
 * src/utils/validate.js
 *
 * Client-side checks that mirror the API 400 rules (email, address fields) so most errors are caught before a request.
 */
import { notImplemented } from './not-implemented.js';

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

/**
 * Same rules as POST /auth/login.
 * @param {{ email: string, password: string }} input
 * @returns {FieldError[]}
 */
export function validateLogin(input) {
  return notImplemented('utils/validate.validateLogin');
}

/**
 * Same rules as PUT /account/addresses/{id}.
 * @param {Record<string, unknown>} input
 * @returns {FieldError[]}
 */
export function validateAddress(input) {
  return notImplemented('utils/validate.validateAddress');
}
