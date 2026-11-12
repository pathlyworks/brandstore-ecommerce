/**
 * src/components/login-form.js
 *
 * Email and password form; field errors from utils/validate and from API 400 details; shows 401 and 429 messages. Components may import api/, state/ and utils/; nothing imports components except main.js.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * Renders and returns an unmount function that removes listeners.
 * @param {HTMLElement} root container to render into
 * @param {object} deps the stores and API functions it needs, passed in by main.js
 * @returns {() => void}
 */
export function mount(root, deps) {
  return notImplemented('components/login-form.mount');
}
