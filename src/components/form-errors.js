/**
 * src/components/form-errors.js
 *
 * Accessible form errors, shared by the sign-in, registration and address forms:
 * - each invalid field gets aria-invalid="true" and its message in `#<id>-error` (already linked
 *   with aria-describedby in the HTML), so a screen reader reads the problem with the field;
 * - an error summary (role="alert", focusable) lists every problem as a link to its field and
 *   receives focus, so keyboard and screen-reader users land on it.
 */
import * as dom from '../utils/dom.js';

/**
 * Read the named fields of a form as trimmed-free text (passwords are not trimmed).
 * @param {HTMLFormElement} form
 * @param {string[]} names
 * @returns {Record<string, string>}
 */
export function readFields(form, names) {
  return Object.fromEntries(
    names.map((name) => [name, form.elements.namedItem(name)?.value ?? '']),
  );
}

/**
 * Remove every error message and invalid mark.
 * @param {HTMLFormElement} form
 */
export function clearErrors(form) {
  dom
    .qsa('[aria-invalid="true"]', form)
    .forEach((field) => field.setAttribute('aria-invalid', 'false'));
  dom.qsa('.field__error', form).forEach((message) => (message.textContent = ''));
  const summary = dom.qs('.form-summary', form);
  if (summary) {
    dom.clear(summary);
    summary.hidden = true;
  }
}

/**
 * Show field errors and/or a general message, then move focus to the summary.
 * @param {HTMLFormElement} form
 * @param {{ field: string, message: string }[]} errors field errors (may be empty)
 * @param {string} [general] a message that belongs to no single field (e.g. wrong credentials)
 */
export function showErrors(form, errors, general = '') {
  clearErrors(form);
  const summary = dom.qs('.form-summary', form);
  const items = errors.map(({ field, message }) => {
    const input = form.elements.namedItem(field);
    input?.setAttribute('aria-invalid', 'true');
    const slot = input && dom.qs(`#${input.id}-error`, form);
    if (slot) slot.textContent = message;
    return dom.el('li', {}, [
      dom.el('a', { text: message, attrs: { href: `#${input?.id ?? field}` } }),
    ]);
  });
  const title = errors.length
    ? `Please fix ${errors.length === 1 ? 'this problem' : `these ${errors.length} problems`}:`
    : '';
  summary.append(
    ...(general ? [dom.el('p', { className: 'form-summary__text', text: general })] : []),
    ...(title
      ? [dom.el('p', { className: 'form-summary__text', text: title }), dom.el('ul', {}, items)]
      : []),
  );
  summary.hidden = false;
  summary.focus();
}
