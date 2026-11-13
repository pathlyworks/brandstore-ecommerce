/*
 * src/utils/dom.js — small helpers for building and finding elements.
 *
 * The rule for the whole project: text that comes from data is inserted with
 * textContent (or a text node), never with innerHTML. The browser then treats
 * it as plain text, so a product name such as "<img onerror=...>" is shown as
 * those characters instead of being run as markup.
 *
 * Every <img> made with el() falls back to the product placeholder when its file cannot be
 * loaded (missing, 404, or not an image), so the shopper never sees a broken-image icon.
 */

/** The image shown when a product's own image is missing or cannot be loaded. */
export const PLACEHOLDER_SRC = '/assets/product-placeholder.svg';

/**
 * Swap an image to the placeholder when it fails to load. Runs at most once per failure: the
 * placeholder itself is never retried, so a missing placeholder cannot loop.
 * @param {HTMLImageElement} img
 * @param {string} [placeholder]
 * @returns {HTMLImageElement}
 */
export function withImageFallback(img, placeholder = PLACEHOLDER_SRC) {
  img.addEventListener('error', function () {
    if (img.getAttribute('src') === placeholder) return;
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.setAttribute('src', placeholder);
    img.dataset.imageMissing = 'true';
  });
  return img;
}
/**
 * Create an element without parsing any HTML.
 * @param {string} tag  Tag name, e.g. 'article'.
 * @param {object} [options]
 * @param {string} [options.className]  Space-separated class list.
 * @param {string} [options.text]  Plain text, set with textContent.
 * @param {object} [options.attrs]  Attribute name -> value (null/undefined skipped).
 * @param {object} [options.dataset]  data-* name -> value.
 * @param {Array<Node|string>} [children]  Nodes to append; strings become text nodes.
 * @returns {HTMLElement}
 */
export function el(tag, options, children) {
  const settings = options || {};
  const node = document.createElement(tag);

  if (settings.className) {
    node.className = settings.className;
  }
  if (settings.text !== undefined) {
    node.textContent = settings.text;
  }
  Object.keys(settings.attrs || {}).forEach(function (name) {
    const value = settings.attrs[name];
    if (value !== null && value !== undefined) {
      node.setAttribute(name, String(value));
    }
  });
  Object.keys(settings.dataset || {}).forEach(function (name) {
    node.dataset[name] = String(settings.dataset[name]);
  });
  (children || []).forEach(function (child) {
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  if (tag === 'img') withImageFallback(node);

  return node;
}

/**
 * Remove every child of a node (used before re-rendering a list).
 * @param {Node} node
 */
export function clear(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

/**
 * Find one element, or null.
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {Element|null}
 */
export function qs(selector, scope) {
  return (scope || document).querySelector(selector);
}

/**
 * Find all matching elements as a real array (so forEach/map/filter work).
 * @param {string} selector
 * @param {ParentNode} [scope]
 * @returns {Element[]}
 */
export function qsa(selector, scope) {
  return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
}
