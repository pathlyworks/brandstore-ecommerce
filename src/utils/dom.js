/**
 * src/utils/dom.js
 *
 * DOM helpers carried over from Phase 1 (textContent only, never innerHTML).
 */
import { notImplemented } from './not-implemented.js';

/**
 * Create an element.
 * @param {string} tag
 * @param {Record<string, unknown>} props attributes, dataset, text
 * @param {Node[]} children
 * @returns {HTMLElement}
 */
export function el(tag, props, children) {
  return notImplemented('utils/dom.el');
}
