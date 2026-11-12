/*
 * src/components/newsletter.js — newsletter form validation with accessible messages.
 *
 * Validation runs on submit. The browser's own bubbles are switched off
 * (noValidate) because their wording differs per browser and language; this
 * file gives one specific message per problem instead.
 *
 * Messages are announced by two always-present live regions:
 *   #newsletter-error    role="alert"   (assertive, interrupts)
 *   #newsletter-success  role="status"  (polite)
 * The input points at the error through aria-describedby and is flagged
 * with aria-invalid while it is wrong. Focus returns to the input on error.
 */
import * as dom from '../utils/dom.js';
import { getEmailError } from '../utils/validate.js';

const REANNOUNCE_DELAY_MS = 50;

/**
 * Collect the elements the form needs, or null when the page has none.
 * @returns {object|null}
 */
function findParts() {
  const form = dom.qs('.newsletter__form');
  const input = dom.qs('#newsletter-email');
  const error = dom.qs('#newsletter-error');
  const success = dom.qs('#newsletter-success');
  const button = form ? dom.qs('[type="submit"]', form) : null;

  if (!form || !input || !error || !success || !button) {
    return null;
  }
  return {
    form: form,
    input: input,
    error: error,
    success: success,
    button: button,
    label: button.textContent,
    errorTimer: null,
  };
}

/**
 * Empty both live regions, clear the invalid flag and cancel any error
 * that is still waiting to be shown (see showError). Cancelling matters:
 * without it a late timer could write a stale error after a success.
 * @param {object} parts
 */
function clearMessages(parts) {
  window.clearTimeout(parts.errorTimer);
  parts.error.textContent = '';
  parts.success.textContent = '';
  parts.input.removeAttribute('aria-invalid');
}

/**
 * Show an error, flag the field and move focus to it. The text is cleared
 * first and set again a moment later so a repeated identical error is
 * still announced by screen readers.
 * @param {object} parts
 * @param {string} message
 */
function showError(parts, message) {
  clearMessages(parts);
  parts.input.setAttribute('aria-invalid', 'true');
  parts.input.focus();
  parts.errorTimer = window.setTimeout(function () {
    // Defence in depth: only write while the field is still flagged.
    if (parts.input.getAttribute('aria-invalid') === 'true') {
      parts.error.textContent = message;
    }
  }, REANNOUNCE_DELAY_MS);
}

/**
 * Confirm the subscription, empty the field and lock the button until the
 * user types again.
 * @param {object} parts
 * @param {string} email  The accepted address (inserted as text).
 */
function showSuccess(parts, email) {
  clearMessages(parts);
  parts.form.reset();
  parts.button.disabled = true;
  parts.button.textContent = 'Subscribed';
  parts.success.textContent = 'Thanks for subscribing! We sent a confirmation to ' + email + '.';
}

/**
 * Put the submit button back to its normal state.
 * @param {object} parts
 */
function resetButton(parts) {
  parts.button.disabled = false;
  parts.button.textContent = parts.label;
}

/**
 * Submit handler: validate, then show an error or the success message.
 * @param {object} parts
 * @param {Event} event
 */
function onSubmit(parts, event) {
  event.preventDefault();
  const message = getEmailError(parts.input.value);

  if (message) {
    showError(parts, message);
  } else {
    showSuccess(parts, parts.input.value.trim());
  }
}

/**
 * Input handler: once the user fixes a flagged field the error goes away
 * straight away; typing after a success unlocks the button.
 * @param {object} parts
 */
function onInput(parts) {
  if (
    parts.input.getAttribute('aria-invalid') === 'true' &&
    getEmailError(parts.input.value) === ''
  ) {
    clearMessages(parts);
  }
  if (parts.button.disabled) {
    resetButton(parts);
    parts.success.textContent = '';
  }
}

/**
 * Attach the listeners.
 */
export function init() {
  const parts = findParts();
  if (!parts) {
    return;
  }
  parts.form.noValidate = true;
  parts.form.addEventListener('submit', function (event) {
    onSubmit(parts, event);
  });
  parts.input.addEventListener('input', function () {
    onInput(parts);
  });
}
