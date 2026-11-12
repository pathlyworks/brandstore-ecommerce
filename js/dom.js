/*
 * dom.js — small helpers for building and finding elements.
 *
 * The rule for the whole project: text that comes from data is inserted with
 * textContent (or a text node), never with innerHTML. The browser then treats
 * it as plain text, so a product name such as "<img onerror=...>" is shown as
 * those characters instead of being run as markup.
 */
(function () {
    'use strict';

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
    function el(tag, options, children) {
        var settings = options || {};
        var node = document.createElement(tag);

        if (settings.className) {
            node.className = settings.className;
        }
        if (settings.text !== undefined) {
            node.textContent = settings.text;
        }
        Object.keys(settings.attrs || {}).forEach(function (name) {
            var value = settings.attrs[name];
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

        return node;
    }

    /**
     * Remove every child of a node (used before re-rendering a list).
     * @param {Node} node
     */
    function clear(node) {
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
    function qs(selector, scope) {
        return (scope || document).querySelector(selector);
    }

    /**
     * Find all matching elements as a real array (so forEach/map/filter work).
     * @param {string} selector
     * @param {ParentNode} [scope]
     * @returns {Element[]}
     */
    function qsa(selector, scope) {
        return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
    }

    window.BrandStore.dom = { el: el, clear: clear, qs: qs, qsa: qsa };
})();
