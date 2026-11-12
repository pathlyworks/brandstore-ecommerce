/**
 * src/components/demo-controls.js
 *
 * Demo panel for reviewers, shown only when the catalog URL ends in #demo. Each button makes the
 * NEXT product request fail with that status, or respond slowly, using the mock API's test headers
 * (X-Mock-Status, X-Mock-Delay; not part of the public contract). This makes the loading and error
 * states demonstrable on the live site without breaking anything for normal visitors.
 */
import * as dom from '../utils/dom.js';

const SCENARIOS = [
  ['400 bad request', { 'X-Mock-Status': '400' }],
  ['404 not found', { 'X-Mock-Status': '404' }],
  ['429 too many requests', { 'X-Mock-Status': '429' }],
  ['500 server error', { 'X-Mock-Status': '500' }],
  ['Slow response (3 s)', { 'X-Mock-Delay': '3000' }],
];

/**
 * @param {HTMLElement} root container, left hidden unless the hash is #demo
 * @param {{ onArm: () => void }} deps called after a scenario is chosen (reloads the results)
 * @returns {{ take: () => Record<string, string> }} headers for the next request (then cleared)
 */
export function mount(root, { onArm }) {
  let pending = {};
  if (window.location.hash !== '#demo') return { take: () => ({}) };
  root.hidden = false;
  root.appendChild(dom.el('p', { className: 'demo__title', text: 'Demo: make the next request…' }));
  SCENARIOS.forEach(([label, headers]) => {
    const button = dom.el('button', {
      className: 'btn btn--ghost demo__button',
      text: label,
      attrs: { type: 'button' },
    });
    button.addEventListener('click', () => {
      pending = headers;
      onArm();
    });
    root.appendChild(button);
  });
  return {
    take() {
      const headers = pending;
      pending = {};
      return headers;
    },
  };
}
