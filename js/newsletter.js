/*
 * newsletter.js — newsletter form validation with accessible messages.
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
(function () {
    'use strict';

    var dom = BrandStore.dom;

    var EMAIL_MAX_LENGTH = 120;
    var LOCAL_PART_PATTERN = /^[A-Za-z0-9._%+'-]+$/;
    var DOMAIN_PATTERN = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
    var REANNOUNCE_DELAY_MS = 50;

    /**
     * Return the first problem with an email address as a sentence that says
     * what to do, or an empty string when the address is acceptable.
     * @param {string} value  Raw field value.
     * @returns {string}
     */
    function getEmailError(value) {
        var email = value.trim();
        var atIndex = email.indexOf('@');
        var local = email.slice(0, atIndex);
        var domain = email.slice(atIndex + 1);

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
            return 'The part before the “@” can only use letters, numbers and . _ % + \' -';
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
     * Collect the elements the form needs, or null when the page has none.
     * @returns {object|null}
     */
    function findParts() {
        var form = dom.qs('.newsletter__form');
        var input = dom.qs('#newsletter-email');
        var error = dom.qs('#newsletter-error');
        var success = dom.qs('#newsletter-success');
        var button = form ? dom.qs('[type="submit"]', form) : null;

        if (!form || !input || !error || !success || !button) {
            return null;
        }
        return { form: form, input: input, error: error, success: success, button: button, label: button.textContent };
    }

    /**
     * Empty both live regions and clear the invalid flag.
     * @param {object} parts
     */
    function clearMessages(parts) {
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
        window.setTimeout(function () {
            parts.error.textContent = message;
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
        var message;
        event.preventDefault();
        message = getEmailError(parts.input.value);

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
        if (parts.input.getAttribute('aria-invalid') === 'true' && getEmailError(parts.input.value) === '') {
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
    function init() {
        var parts = findParts();
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

    BrandStore.register('newsletter', init);
    BrandStore.newsletter = { getEmailError: getEmailError };
})();
