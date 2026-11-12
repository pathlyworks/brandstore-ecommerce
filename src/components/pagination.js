/**
 * src/components/pagination.js
 *
 * Previous / next and page numbers from meta.totalPages. Components may import api/, state/ and utils/; nothing imports components except main.js.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * Renders and returns an unmount function that removes listeners.
 * @param {HTMLElement} root container to render into
 * @param {object} deps the stores and API functions it needs, passed in by main.js
 * @returns {() => void}
 */
export function mount(root, deps) {
  return notImplemented('components/pagination.mount');
}
